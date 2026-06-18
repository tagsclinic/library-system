import {
  BookStatus,
  BorrowerStatus,
  LoanStatus,
  type Prisma,
} from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  getRequestMeta,
  isErrorResponse,
  notDeleted,
  paginatedResponse,
  parsePagination,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canCheckout } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { calculateDueDate } from "@/lib/utils";
import { checkoutSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const status = searchParams.get("status") as LoanStatus | null;
  const borrowerId = searchParams.get("borrowerId");
  const bookId = searchParams.get("bookId");

  const where: Prisma.LoanWhereInput = {
    organizationId,
    ...notDeleted(),
  };

  const andFilters: Prisma.LoanWhereInput[] = [];

  if (status && Object.values(LoanStatus).includes(status)) {
    if (status === LoanStatus.OVERDUE) {
      andFilters.push({
        OR: [
          { status: LoanStatus.OVERDUE },
          { status: LoanStatus.ACTIVE, dueDate: { lt: new Date() } },
        ],
      });
    } else {
      where.status = status;
    }
  }

  if (borrowerId) where.borrowerId = borrowerId;
  if (bookId) where.bookId = bookId;

  const activeOnly = searchParams.get("active") === "true";
  if (activeOnly) {
    where.status = { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] };
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    andFilters.push({
      OR: [
        { book: { title: { contains: q, mode: "insensitive" } } },
        { book: { author: { contains: q, mode: "insensitive" } } },
        { book: { barcodeValue: { contains: q, mode: "insensitive" } } },
        { borrower: { fullName: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      orderBy: activeOnly
        ? [{ dueDate: "asc" }, { checkoutDate: "desc" }]
        : { checkoutDate: "desc" },
      skip,
      take: limit,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            barcodeValue: true,
            status: true,
          },
        },
        borrower: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        _count: { select: { renewals: true } },
      },
    }),
    prisma.loan.count({ where }),
  ]);

  return NextResponse.json(
    serialize(paginatedResponse(loans, total, page, limit))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canCheckout(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const [book, borrower] = await Promise.all([
    prisma.book.findFirst({
      where: {
        id: parsed.data.bookId,
        organizationId: auth.organizationId,
        ...notDeleted(),
      },
    }),
    prisma.borrower.findFirst({
      where: {
        id: parsed.data.borrowerId,
        organizationId: auth.organizationId,
        ...notDeleted(),
      },
    }),
  ]);

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (!borrower) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
  }

  if (book.status !== BookStatus.AVAILABLE) {
    return NextResponse.json(
      { error: "Book is not available for checkout" },
      { status: 409 }
    );
  }

  if (
    borrower.status === BorrowerStatus.BLOCKED ||
    borrower.status === BorrowerStatus.PENDING
  ) {
    return NextResponse.json(
      {
        error:
          borrower.status === BorrowerStatus.PENDING
            ? "Borrower account is pending approval"
            : "Borrower is blocked and cannot check out books",
      },
      { status: 409 }
    );
  }

  const checkoutDate = new Date();
  const dueDate = calculateDueDate(
    checkoutDate,
    parsed.data.loanPeriodType,
    parsed.data.customDays
  );
  const { ipAddress, userAgent } = getRequestMeta(request);

  let loan;
  try {
    loan = await prisma.$transaction(async (tx) => {
      const bookUpdate = await tx.book.updateMany({
        where: {
          id: parsed.data.bookId,
          organizationId: auth.organizationId,
          status: BookStatus.AVAILABLE,
          deletedAt: null,
        },
        data: { status: BookStatus.CHECKED_OUT },
      });

      if (bookUpdate.count === 0) {
        throw new Error("BOOK_NOT_AVAILABLE");
      }

      const created = await tx.loan.create({
        data: {
          organizationId: auth.organizationId,
          bookId: parsed.data.bookId,
          borrowerId: parsed.data.borrowerId,
          checkoutDate,
          dueDate,
          loanPeriodType: parsed.data.loanPeriodType,
          customDays: parsed.data.customDays ?? null,
          checkoutCondition: parsed.data.checkoutCondition,
          checkoutNotes: parsed.data.checkoutNotes ?? null,
          termsAccepted: true,
          termsAcceptedAt: checkoutDate,
          termsVersion: parsed.data.termsVersion,
          status: LoanStatus.ACTIVE,
          checkedOutBy: auth.user.email ?? auth.user.id,
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
          borrower: { select: { id: true, fullName: true } },
        },
      });

      await tx.book.update({
        where: { id: parsed.data.bookId },
        data: { currentCondition: parsed.data.checkoutCondition },
      });

      await tx.conditionHistory.create({
        data: {
          organizationId: auth.organizationId,
          bookId: parsed.data.bookId,
          loanId: created.id,
          condition: parsed.data.checkoutCondition,
          notes: parsed.data.checkoutNotes ?? "Condition recorded at checkout",
          recordedBy: auth.user.email ?? auth.user.id,
        },
      });

      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOK_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Book is not available for checkout" },
        { status: 409 }
      );
    }
    throw error;
  }

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "CHECKOUT",
    entityType: "Loan",
    entityId: loan.id,
    description: `Checked out "${book.title}" to ${borrower.fullName}`,
    newData: serialize(loan),
    ipAddress,
    userAgent,
    bookId: book.id,
    borrowerId: borrower.id,
    loanId: loan.id,
  });

  return NextResponse.json({ data: serialize(loan) }, { status: 201 });
}
