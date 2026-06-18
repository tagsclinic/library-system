import { BorrowerStatus, ReservationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  getRequestMeta,
  isErrorResponse,
  requireAuth,
  serialize,
} from "@/lib/api-helpers";
import { canManageBorrowers } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { reservationReviewSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBorrowers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = reservationReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const reservation = await prisma.bookReservation.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: { book: true, borrower: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const allowedNextStatuses: Record<ReservationStatus, ReservationStatus[]> = {
    [ReservationStatus.PENDING]: [ReservationStatus.APPROVED, ReservationStatus.REJECTED],
    [ReservationStatus.APPROVED]: [ReservationStatus.FULFILLED, ReservationStatus.CANCELLED],
    [ReservationStatus.REJECTED]: [],
    [ReservationStatus.FULFILLED]: [],
    [ReservationStatus.CANCELLED]: [],
  };

  if (!allowedNextStatuses[reservation.status].includes(parsed.data.status as ReservationStatus)) {
    return NextResponse.json(
      {
        error: `Cannot change reservation from ${reservation.status} to ${parsed.data.status}`,
      },
      { status: 409 }
    );
  }

  const updated = await prisma.bookReservation.update({
    where: { id },
    data: {
      status: parsed.data.status as ReservationStatus,
      notes: parsed.data.notes ?? reservation.notes,
      reviewedBy: auth.user.email ?? auth.user.id,
      reviewedAt: new Date(),
    },
    include: {
      book: { select: { id: true, title: true, author: true } },
      borrower: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (
    parsed.data.status === ReservationStatus.APPROVED &&
    reservation.borrower.status === BorrowerStatus.PENDING
  ) {
    await prisma.borrower.update({
      where: { id: reservation.borrowerId },
      data: { status: BorrowerStatus.ACTIVE },
    });
  }

  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "UPDATE",
    entityType: "BookReservation",
    entityId: reservation.id,
    description: `${parsed.data.status} reservation for "${reservation.book.title}" by ${reservation.borrower.fullName}`,
    newData: serialize(updated),
    ipAddress,
    userAgent,
    borrowerId: reservation.borrowerId,
    bookId: reservation.bookId,
  });

  return NextResponse.json(serialize({ data: updated }));
}
