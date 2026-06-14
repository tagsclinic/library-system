import { BorrowerStatus, type Prisma } from "@prisma/client";
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
import { canManageBorrowers } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBorrowerRiskProfile } from "@/lib/risk";
import { logAudit } from "@/lib/services/audit";
import { borrowerSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const status = searchParams.get("status") as BorrowerStatus | null;
  const q = searchParams.get("q");

  const where: Prisma.BorrowerWhereInput = {
    organizationId,
    ...notDeleted(),
  };

  if (status && Object.values(BorrowerStatus).includes(status)) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [borrowers, total] = await Promise.all([
    prisma.borrower.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip,
      take: limit,
      include: {
        _count: { select: { loans: { where: { deletedAt: null } } } },
      },
    }),
    prisma.borrower.count({ where }),
  ]);

  const data = await Promise.all(
    borrowers.map(async (borrower) => ({
      ...borrower,
      riskProfile: await getBorrowerRiskProfile(organizationId, borrower.id),
    }))
  );

  return NextResponse.json(
    serialize(paginatedResponse(data, total, page, limit))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBorrowers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = borrowerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { ipAddress, userAgent } = getRequestMeta(request);

  const borrower = await prisma.borrower.create({
    data: {
      organizationId: auth.organizationId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    },
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "CREATE",
    entityType: "Borrower",
    entityId: borrower.id,
    description: `Created borrower "${borrower.fullName}"`,
    newData: serialize(borrower),
    ipAddress,
    userAgent,
    borrowerId: borrower.id,
  });

  const riskProfile = await getBorrowerRiskProfile(
    auth.organizationId,
    borrower.id
  );

  return NextResponse.json(
    { data: serialize({ ...borrower, riskProfile }) },
    { status: 201 }
  );
}
