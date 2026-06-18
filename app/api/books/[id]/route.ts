import { LoanStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  getRequestMeta,
  isErrorResponse,
  notDeleted,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canManageBooks } from "@/lib/auth";
import { softDeleteData } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { getSiblingCopies } from "@/lib/services/book-copies";
import { bookUpdateSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

async function findOrgBook(organizationId: string, id: string) {
  return prisma.book.findFirst({
    where: { id, organizationId, ...notDeleted() },
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  const book = await prisma.book.findFirst({
    where: { id, organizationId: auth.organizationId, ...notDeleted() },
    include: {
      conditionHistory: { orderBy: { recordedAt: "desc" }, take: 10 },
      loans: {
        where: { deletedAt: null },
        orderBy: { checkoutDate: "desc" },
        take: 5,
        include: { borrower: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const siblingCopies = await getSiblingCopies(
    auth.organizationId,
    book.copyGroupId,
    book.id
  );

  return NextResponse.json({
    data: serialize({
      ...book,
      siblingCopies,
      copyStats: book.copyGroupId
        ? {
            copyNumber: book.copyNumber,
            total: siblingCopies.length + 1,
          }
        : null,
    }),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findOrgBook(auth.organizationId, id);

  if (!existing) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = bookUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { ipAddress, userAgent } = getRequestMeta(request);

  // quantity is a create-time-only directive (how many copies to make),
  // not a column on Book — strip it before passing to update().
  const { quantity, ...updateData } = parsed.data;

  const book = await prisma.book.update({
    where: { id },
    data: {
      ...updateData,
      coverImageUrl: updateData.coverImageUrl || null,
    },
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "UPDATE",
    entityType: "Book",
    entityId: book.id,
    description: `Updated book "${book.title}"`,
    previousData: serialize(existing),
    newData: serialize(book),
    ipAddress,
    userAgent,
    bookId: book.id,
  });

  return NextResponse.json({ data: serialize(book) });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findOrgBook(auth.organizationId, id);

  if (!existing) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const activeLoan = await prisma.loan.findFirst({
    where: {
      organizationId: auth.organizationId,
      bookId: id,
      ...notDeleted(),
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
    },
  });

  if (activeLoan) {
    return NextResponse.json(
      { error: "Cannot delete book with an active loan" },
      { status: 409 }
    );
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  await prisma.book.update({
    where: { id },
    data: softDeleteData(),
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "DELETE",
    entityType: "Book",
    entityId: id,
    description: `Deleted book "${existing.title}"`,
    previousData: serialize(existing),
    ipAddress,
    userAgent,
    bookId: id,
  });

  return NextResponse.json({ data: { id } });
}
