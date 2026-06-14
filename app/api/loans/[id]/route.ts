import {
  BookCondition,
  BookStatus,
  LoanStatus,
  PaymentStatus,
} from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  getRequestMeta,
  isErrorResponse,
  notDeleted,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canCheckIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { checkinSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

async function findOrgLoan(organizationId: string, id: string) {
  return prisma.loan.findFirst({
    where: { id, organizationId, ...notDeleted() },
    include: { book: true, borrower: true },
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  const loan = await prisma.loan.findFirst({
    where: { id, organizationId: auth.organizationId, ...notDeleted() },
    include: {
      book: true,
      borrower: true,
      renewals: { orderBy: { createdAt: "desc" } },
      conditionHistory: { orderBy: { recordedAt: "desc" } },
      notifications: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  return NextResponse.json({ data: serialize(loan) });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const action = body.action as string | undefined;

  if (action && action !== "checkin") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!canCheckIn(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await findOrgLoan(auth.organizationId, id);

  if (!existing) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  if (
    existing.status !== LoanStatus.ACTIVE &&
    existing.status !== LoanStatus.OVERDUE
  ) {
    return NextResponse.json(
      { error: "Loan is not active and cannot be checked in" },
      { status: 409 }
    );
  }

  const parsed = checkinSchema.safeParse({ ...body, loanId: id });
  if (!parsed.success) return validationError(parsed.error);

  const returnDate = new Date();
  const { ipAddress, userAgent } = getRequestMeta(request);

  let loanStatus: LoanStatus = LoanStatus.RETURNED;
  let bookStatus: BookStatus = BookStatus.AVAILABLE;
  let bookCondition = parsed.data.returnCondition;
  let amountOwed = parsed.data.amountOwed ?? null;
  let repairCost = parsed.data.repairCost ?? null;
  let paymentStatus = parsed.data.paymentStatus ?? null;

  if (parsed.data.markAsLost) {
    loanStatus = LoanStatus.LOST;
    bookStatus = BookStatus.LOST;
    bookCondition = BookCondition.LOST;
    amountOwed =
      amountOwed ??
      (existing.book.replacementValue
        ? Number(existing.book.replacementValue)
        : null);
    paymentStatus = paymentStatus ?? PaymentStatus.PENDING;
  } else if (parsed.data.markAsDamaged) {
    loanStatus = LoanStatus.DAMAGED;
    bookStatus = BookStatus.DAMAGED;
    bookCondition = BookCondition.DAMAGED;
    if (repairCost !== null && paymentStatus === null) {
      paymentStatus = PaymentStatus.PENDING;
    }
  }

  const loan = await prisma.$transaction(async (tx) => {
    const updated = await tx.loan.update({
      where: { id },
      data: {
        returnDate,
        returnCondition: parsed.data.returnCondition,
        returnNotes: parsed.data.returnNotes ?? null,
        status: loanStatus,
        repairCost,
        amountOwed,
        paymentStatus,
        checkedInBy: auth.user.email ?? auth.user.id,
      },
      include: {
        book: { select: { id: true, title: true } },
        borrower: { select: { id: true, fullName: true } },
      },
    });

    await tx.book.update({
      where: { id: existing.bookId },
      data: {
        status: bookStatus,
        currentCondition: bookCondition,
      },
    });

    await tx.conditionHistory.create({
      data: {
        organizationId: auth.organizationId,
        bookId: existing.bookId,
        loanId: id,
        condition: parsed.data.returnCondition,
        notes: parsed.data.returnNotes ?? "Condition recorded at check-in",
        recordedBy: auth.user.email ?? auth.user.id,
      },
    });

    return updated;
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "CHECKIN",
    entityType: "Loan",
    entityId: loan.id,
    description: `Checked in "${existing.book.title}" from ${existing.borrower.fullName}`,
    previousData: serialize(existing),
    newData: serialize(loan),
    ipAddress,
    userAgent,
    bookId: existing.bookId,
    borrowerId: existing.borrowerId,
    loanId: loan.id,
  });

  return NextResponse.json({ data: serialize(loan) });
}
