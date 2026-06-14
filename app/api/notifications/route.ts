import { addDays } from "date-fns";
import {
  LoanStatus,
  NotificationChannel,
  NotificationType,
  type Prisma,
} from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAppSetting,
  isErrorResponse,
  notDeleted,
  paginatedResponse,
  parsePagination,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canSendNotifications } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendNotification,
  type SendNotificationResult,
  type TemplateVariables,
} from "@/lib/services/notifications";
import { formatDate } from "@/lib/utils";

const sendNotificationSchema = z.object({
  channel: z.nativeEnum(NotificationChannel),
  type: z.nativeEnum(NotificationType),
  recipient: z.string().min(1),
  loanId: z.string().cuid().optional().nullable(),
  variables: z.record(z.string()).optional(),
});

const bulkNotificationSchema = z.object({
  action: z.enum(["send-overdue", "send-due-soon"]),
  channel: z.nativeEnum(NotificationChannel),
});

const postBodySchema = z.union([bulkNotificationSchema, sendNotificationSchema]);

function getRecipient(
  channel: NotificationChannel,
  email: string | null | undefined,
  phone: string
) {
  return channel === NotificationChannel.EMAIL ? email : phone;
}

async function sendBulkNotifications(
  organizationId: string,
  action: "send-overdue" | "send-due-soon",
  channel: NotificationChannel
) {
  const now = new Date();
  const libraryName =
    (await getAppSetting(organizationId, "libraryName")) ??
    "LibraryOS Community Library";

  let loans;

  if (action === "send-overdue") {
    loans = await prisma.loan.findMany({
      where: {
        organizationId,
        ...notDeleted(),
        OR: [
          { status: LoanStatus.OVERDUE },
          { status: LoanStatus.ACTIVE, dueDate: { lt: now } },
        ],
      },
      include: { book: true, borrower: true },
    });
  } else {
    const dueSoonDaysSetting = await getAppSetting(organizationId, "dueSoonDays");
    const dueSoonDays = dueSoonDaysSetting ? parseInt(dueSoonDaysSetting, 10) : 3;
    const dueSoonCutoff = addDays(now, dueSoonDays);

    loans = await prisma.loan.findMany({
      where: {
        organizationId,
        ...notDeleted(),
        status: LoanStatus.ACTIVE,
        dueDate: { gte: now, lte: dueSoonCutoff },
      },
      include: { book: true, borrower: true },
    });
  }

  const type =
    action === "send-overdue"
      ? NotificationType.OVERDUE
      : NotificationType.DUE_SOON;

  const results: SendNotificationResult[] = [];

  for (const loan of loans) {
    const recipient = getRecipient(
      channel,
      loan.borrower.email,
      loan.borrower.phone
    );

    if (!recipient) continue;

    const variables: TemplateVariables = {
      borrowerName: loan.borrower.fullName,
      title: loan.book.title,
      author: loan.book.author,
      dueDate: formatDate(loan.dueDate),
      libraryName,
      loanId: loan.id,
    };

    const result = await sendNotification({
      organizationId,
      channel,
      recipient,
      type,
      variables,
      loanId: loan.id,
    });

    results.push(result);
  }

  return {
    action,
    channel,
    attempted: results.length,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    notConfigured: results.filter((r) => r.status === "NOT_CONFIGURED").length,
    results,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const type = searchParams.get("type") as NotificationType | null;
  const loanId = searchParams.get("loanId");

  const where: Prisma.NotificationLogWhereInput = { organizationId };

  if (
    status &&
    ["PENDING", "SENT", "FAILED", "NOT_CONFIGURED"].includes(status)
  ) {
    where.status = status as Prisma.NotificationLogWhereInput["status"];
  }

  if (type && Object.values(NotificationType).includes(type)) {
    where.type = type;
  }

  if (loanId) where.loanId = loanId;

  const [notifications, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        loan: {
          select: {
            id: true,
            book: { select: { title: true } },
            borrower: { select: { fullName: true } },
          },
        },
      },
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return NextResponse.json(
    serialize(paginatedResponse(notifications, total, page, limit))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canSendNotifications(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  if ("action" in parsed.data) {
    const bulkResult = await sendBulkNotifications(
      auth.organizationId,
      parsed.data.action,
      parsed.data.channel
    );

    return NextResponse.json({ data: serialize(bulkResult) }, { status: 201 });
  }

  let variables: TemplateVariables = parsed.data.variables ?? {};

  if (parsed.data.loanId) {
    const loan = await prisma.loan.findFirst({
      where: {
        id: parsed.data.loanId,
        organizationId: auth.organizationId,
        ...notDeleted(),
      },
      include: { book: true, borrower: true },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    variables = {
      borrowerName: loan.borrower.fullName,
      title: loan.book.title,
      author: loan.book.author,
      dueDate: loan.dueDate.toISOString(),
      loanId: loan.id,
      replacementValue: loan.book.replacementValue
        ? String(Number(loan.book.replacementValue))
        : undefined,
      ...variables,
    };
  }

  const result = await sendNotification({
    organizationId: auth.organizationId,
    channel: parsed.data.channel,
    recipient: parsed.data.recipient,
    type: parsed.data.type,
    variables,
    loanId: parsed.data.loanId,
  });

  return NextResponse.json({ data: serialize(result) }, { status: 201 });
}
