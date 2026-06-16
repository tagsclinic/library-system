import { LoanStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const loanInclude = {
  book: {
    select: {
      id: true,
      title: true,
      author: true,
      barcodeValue: true,
      isbn: true,
      replacementValue: true,
    },
  },
  borrower: { select: { id: true, fullName: true, phone: true } },
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const barcode = request.nextUrl.searchParams.get("barcode")?.trim();
  const bookId = request.nextUrl.searchParams.get("bookId")?.trim();
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!barcode && !bookId && !q) {
    return NextResponse.json(
      { error: "barcode, bookId, or q query parameter is required" },
      { status: 400 }
    );
  }

  const baseWhere = {
    organizationId: auth.organizationId,
    ...notDeleted(),
    status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
  };

  if (barcode || bookId) {
    const loan = await prisma.loan.findFirst({
      where: {
        ...baseWhere,
        book: {
          organizationId: auth.organizationId,
          ...notDeleted(),
          ...(barcode
            ? {
                OR: [{ barcodeValue: barcode }, { qrCodeValue: barcode }, { isbn: barcode }],
              }
            : { id: bookId }),
        },
      },
      include: loanInclude,
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

  const loans = await prisma.loan.findMany({
    where: {
      ...baseWhere,
      OR: [
        { id: { contains: q!, mode: "insensitive" } },
        {
          book: {
            organizationId: auth.organizationId,
            ...notDeleted(),
            OR: [
              { title: { contains: q!, mode: "insensitive" } },
              { author: { contains: q!, mode: "insensitive" } },
              { isbn: { contains: q!, mode: "insensitive" } },
              { barcodeValue: { contains: q!, mode: "insensitive" } },
              { qrCodeValue: { contains: q!, mode: "insensitive" } },
            ],
          },
        },
        {
          borrower: {
            organizationId: auth.organizationId,
            ...notDeleted(),
            OR: [
              { fullName: { contains: q!, mode: "insensitive" } },
              { phone: { contains: q!, mode: "insensitive" } },
              { email: { contains: q!, mode: "insensitive" } },
            ],
          },
        },
      ],
    },
    include: loanInclude,
    orderBy: { checkoutDate: "desc" },
    take: 10,
  });

  return NextResponse.json({ data: serialize(loans) });
}
