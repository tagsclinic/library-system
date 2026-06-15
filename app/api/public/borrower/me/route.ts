import { NextResponse } from "next/server";

import {
  isErrorResponse,
  requireBorrowerAuth,
  serialize,
} from "@/lib/api-helpers";
import { getBorrowerForUser } from "@/lib/borrower-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireBorrowerAuth();
  if (isErrorResponse(auth)) return auth;

  const borrower = await getBorrowerForUser(auth.user);
  if (!borrower) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: borrower.organizationId },
    select: { id: true, name: true, slug: true, logo: true },
  });

  const reservations = await prisma.bookReservation.findMany({
    where: { borrowerId: borrower.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      book: {
        select: { id: true, title: true, author: true, coverImageUrl: true },
      },
    },
  });

  return NextResponse.json(
    serialize({
      data: {
        borrower,
        organization,
        reservations,
      },
    })
  );
}
