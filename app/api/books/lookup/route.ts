import { BookStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const code =
    request.nextUrl.searchParams.get("barcode")?.trim() ??
    request.nextUrl.searchParams.get("isbn")?.trim() ??
    request.nextUrl.searchParams.get("q")?.trim();

  if (!code) {
    return NextResponse.json(
      { error: "barcode, isbn, or q query parameter is required" },
      { status: 400 }
    );
  }

  const book = await prisma.book.findFirst({
    where: {
      organizationId: auth.organizationId,
      ...notDeleted(),
      status: BookStatus.AVAILABLE,
      OR: [
        { barcodeValue: code },
        { qrCodeValue: code },
        { isbn: code },
        { title: { contains: code, mode: "insensitive" } },
      ],
    },
    orderBy: { title: "asc" },
  });

  if (!book) {
    return NextResponse.json(
      { error: "No available book found for this barcode or ISBN" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: serialize(book) });
}
