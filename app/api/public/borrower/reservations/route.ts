import { BookStatus, ReservationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  isErrorResponse,
  requireApprovedBorrowerAuth,
  serialize,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { reservationCreateSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireApprovedBorrowerAuth();
  if (isErrorResponse(auth)) return auth;

  const reservations = await prisma.bookReservation.findMany({
    where: { borrowerId: auth.borrowerId },
    orderBy: { createdAt: "desc" },
    include: {
      book: {
        select: { id: true, title: true, author: true, coverImageUrl: true, status: true },
      },
    },
  });

  return NextResponse.json(serialize({ data: reservations }));
}

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBorrowerAuth();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const parsed = reservationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const book = await prisma.book.findFirst({
    where: {
      id: parsed.data.bookId,
      organizationId: auth.organizationId,
      deletedAt: null,
    },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.status !== BookStatus.AVAILABLE) {
    return NextResponse.json(
      { error: "This book is not available to reserve right now." },
      { status: 400 }
    );
  }

  const existing = await prisma.bookReservation.findFirst({
    where: {
      bookId: book.id,
      borrowerId: auth.borrowerId,
      status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active reservation for this book." },
      { status: 409 }
    );
  }

  const reservation = await prisma.bookReservation.create({
    data: {
      organizationId: auth.organizationId,
      bookId: book.id,
      borrowerId: auth.borrowerId,
      notes: parsed.data.notes ?? null,
      status: ReservationStatus.PENDING,
    },
    include: {
      book: {
        select: { id: true, title: true, author: true },
      },
    },
  });

  return NextResponse.json(
    serialize({
      data: {
        reservation,
        message:
          "Reservation request submitted. A librarian will review and approve it.",
      },
    }),
    { status: 201 }
  );
}
