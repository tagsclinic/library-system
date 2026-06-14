import { LoanStatus, NotificationChannel, NotificationType } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  getAppSetting,
  getRequestMeta,
  isErrorResponse,
  notDeleted,
  paginatedResponse,
  parsePagination,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canProcessRenewals } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import {
  sendNotification,
  type TemplateVariables,
} from "@/lib/services/notifications";
import { calculateDueDate, formatDate } from "@/lib/utils";
import { renewalSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const loanId = searchParams.get("loanId");
  const borrowerId = searchParams.get("borrowerId");

  const where = {
    organizationId,
    ...(loanId ? { loanId } : {}),
    ...(borrowerId ? { loan: { borrowerId, deletedAt: null } } : {}),
  };

  const [renewals, total] = await Promise.all([
    prisma.renewal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        loan: {
          include: {
            book: { select: { id: true, title: true, author: true } },
            borrower: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
    prisma.renewal.count({ where }),
  ]);

  return NextResponse.json(
    serialize(paginatedResponse(renewals, total, page, limit))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canProcessRenewals(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = renewalSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const loan = await prisma.loan.findFirst({
    where: {
      id: parsed.data.loanId,
      organizationId: auth.organizationId,
      ...notDeleted(),
    },
    include: {
      book: true,
      borrower: true,
      _count: { select: { renewals: true } },
    },
  });

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
    return NextResponse.json(
      { error: "Only active loans can be renewed" },
      { status: 409 }
    );
  }

  const maxRenewalsSetting = await getAppSetting(
    auth.organizationId,
    "maxRenewals"
  );
  const maxRenewals = maxRenewalsSetting ? parseInt(maxRenewalsSetting, 10) : 2;

  if (loan._count.renewals >= maxRenewals) {
    return NextResponse.json(
      { error: `Maximum renewals (${maxRenewals}) reached for this loan` },
      { status: 409 }
    );
  }

  const oldDueDate = loan.dueDate;
  const newDueDate = calculateDueDate(
    oldDueDate,
    parsed.data.loanPeriodType,
    parsed.data.customDays
  );
  const { ipAddress, userAgent } = getRequestMeta(request);

  const renewal = await prisma.$transaction(async (tx) => {
    const created = await tx.renewal.create({
      data: {
        organizationId: auth.organizationId,
        loanId: loan.id,
        oldDueDate,
        newDueDate,
        reason: parsed.data.reason ?? null,
        approvedBy: auth.user.email ?? auth.user.id,
      },
      include: {
        loan: {
          include: {
            book: { select: { id: true, title: true, author: true } },
            borrower: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        dueDate: newDueDate,
        status: LoanStatus.ACTIVE,
      },
    });

    return created;
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "RENEWAL",
    entityType: "Renewal",
    entityId: renewal.id,
    description: `Renewed loan for "${loan.book.title}" — new due date ${formatDate(newDueDate)}`,
    newData: serialize(renewal),
    ipAddress,
    userAgent,
    bookId: loan.bookId,
    borrowerId: loan.borrowerId,
    loanId: loan.id,
  });

  const libraryName =
    (await getAppSetting(auth.organizationId, "libraryName")) ??
    "LibraryOS Community Library";

  if (loan.borrower.email) {
    const variables: TemplateVariables = {
      borrowerName: loan.borrower.fullName,
      title: loan.book.title,
      author: loan.book.author,
      newDueDate: formatDate(newDueDate),
      libraryName,
      loanId: loan.id,
    };

    await sendNotification({
      organizationId: auth.organizationId,
      channel: NotificationChannel.EMAIL,
      recipient: loan.borrower.email,
      type: NotificationType.RENEWAL_APPROVED,
      variables,
      loanId: loan.id,
    });
  }

  return NextResponse.json({ data: serialize(renewal) }, { status: 201 });
}
