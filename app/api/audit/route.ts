import { AuditAction, type Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  isErrorResponse,
  paginatedResponse,
  parsePagination,
  requireAuth,
  serialize,
} from "@/lib/api-helpers";
import { canViewAudit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canViewAudit(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const action = searchParams.get("action") as AuditAction | null;
  const entityType = searchParams.get("entityType");
  const userId = searchParams.get("userId");
  const bookId = searchParams.get("bookId");
  const borrowerId = searchParams.get("borrowerId");
  const loanId = searchParams.get("loanId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.AuditLogWhereInput = { organizationId };

  if (action && Object.values(AuditAction).includes(action)) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = { equals: entityType, mode: "insensitive" };
  }

  if (userId) where.userId = userId;
  if (bookId) where.bookId = bookId;
  if (borrowerId) where.borrowerId = borrowerId;
  if (loanId) where.loanId = loanId;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        book: { select: { id: true, title: true } },
        borrower: { select: { id: true, fullName: true } },
        loan: { select: { id: true, status: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json(
    serialize(paginatedResponse(logs, total, page, limit))
  );
}
