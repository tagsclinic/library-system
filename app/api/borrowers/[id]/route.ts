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
import { canManageBorrowers } from "@/lib/auth";
import { softDeleteData } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { getBorrowerRiskProfile } from "@/lib/risk";
import { logAudit } from "@/lib/services/audit";
import { borrowerUpdateSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

async function findOrgBorrower(organizationId: string, id: string) {
  return prisma.borrower.findFirst({
    where: { id, organizationId, ...notDeleted() },
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  const borrower = await prisma.borrower.findFirst({
    where: { id, organizationId: auth.organizationId, ...notDeleted() },
    include: {
      loans: {
        where: { deletedAt: null },
        orderBy: { checkoutDate: "desc" },
        take: 10,
        include: {
          book: { select: { id: true, title: true, author: true } },
        },
      },
    },
  });

  if (!borrower) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
  }

  const riskProfile = await getBorrowerRiskProfile(auth.organizationId, id);

  return NextResponse.json({
    data: serialize({
      ...borrower,
      riskProfile,
    }),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBorrowers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findOrgBorrower(auth.organizationId, id);

  if (!existing) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = borrowerUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { ipAddress, userAgent } = getRequestMeta(request);

  const borrower = await prisma.borrower.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
    },
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "UPDATE",
    entityType: "Borrower",
    entityId: borrower.id,
    description: `Updated borrower "${borrower.fullName}"`,
    previousData: serialize(existing),
    newData: serialize(borrower),
    ipAddress,
    userAgent,
    borrowerId: borrower.id,
  });

  const riskProfile = await getBorrowerRiskProfile(auth.organizationId, id);

  return NextResponse.json({
    data: serialize({
      ...borrower,
      riskProfile,
    }),
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBorrowers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findOrgBorrower(auth.organizationId, id);

  if (!existing) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
  }

  const activeLoan = await prisma.loan.findFirst({
    where: {
      organizationId: auth.organizationId,
      borrowerId: id,
      ...notDeleted(),
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
    },
  });

  if (activeLoan) {
    return NextResponse.json(
      { error: "Cannot delete borrower with active loans" },
      { status: 409 }
    );
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  await prisma.borrower.update({
    where: { id },
    data: softDeleteData(),
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "DELETE",
    entityType: "Borrower",
    entityId: id,
    description: `Deleted borrower "${existing.fullName}"`,
    previousData: serialize(existing),
    ipAddress,
    userAgent,
    borrowerId: id,
  });

  return NextResponse.json({ data: { id } });
}
