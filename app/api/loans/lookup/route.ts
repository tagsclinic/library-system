import { LoanStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const barcode = request.nextUrl.searchParams.get("barcode")?.trim();
  const bookId = request.nextUrl.searchParams.get("bookId")?.trim();

  if (!barcode && !bookId) {
    return NextResponse.json(
      { error: "barcode or bookId query parameter is required" },
      { status: 400 }
    );
  }

  const loan = await prisma.loan.findFirst({
    where: {
      organizationId: auth.organizationId,
      ...notDeleted(),
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      book: {
        organizationId: auth.organizationId,
        ...notDeleted(),
        ...(barcode
          ? {
              OR: [{ barcodeValue: barcode }, { qrCodeValue: barcode }],
            }
          : { id: bookId }),
      },
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          barcodeValue: true,
          replacementValue: true,
        },
      },
      borrower: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { checkoutDate: "desc" },
  });

  if (!loan) {
    return NextResponse.json(
      { error: "No active loan found for this book" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: serialize(loan) });
}
