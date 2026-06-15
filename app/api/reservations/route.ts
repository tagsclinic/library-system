import { ReservationStatus, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  isErrorResponse,
  parsePagination,
  requireAuth,
  serialize,
} from "@/lib/api-helpers";
import { canManageBorrowers } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBorrowers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const status = searchParams.get("status") as ReservationStatus | null;

  const where: Prisma.BookReservationWhereInput = {
    organizationId: auth.organizationId,
  };

  if (status && Object.values(ReservationStatus).includes(status)) {
    where.status = status;
  }

  const [reservations, total] = await Promise.all([
    prisma.bookReservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        book: {
          select: { id: true, title: true, author: true, coverImageUrl: true, status: true },
        },
        borrower: {
          select: { id: true, fullName: true, email: true, phone: true, status: true },
        },
      },
    }),
    prisma.bookReservation.count({ where }),
  ]);

  return NextResponse.json(
    serialize({
      data: reservations,
      total,
      page,
      limit,
    })
  );
}
