import { BookStatus, type Prisma } from "@prisma/client";
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
import { canManageBooks } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { generateBookCodes } from "@/lib/services/barcode";
import { bookSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const { page, limit, skip } = parsePagination(searchParams);
  const status = searchParams.get("status") as BookStatus | null;
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const where: Prisma.BookWhereInput = {
    organizationId,
    ...notDeleted(),
  };

  if (status && Object.values(BookStatus).includes(status)) {
    where.status = status;
  }

  if (category) {
    where.category = { equals: category, mode: "insensitive" };
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
      { isbn: { contains: q, mode: "insensitive" } },
      { barcodeValue: { contains: q, mode: "insensitive" } },
    ];
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { title: "asc" },
      skip,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  return NextResponse.json(
    serialize(paginatedResponse(books, total, page, limit))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const codes = await generateBookCodes(auth.organizationId);
  const { ipAddress, userAgent } = getRequestMeta(request);

  const book = await prisma.book.create({
    data: {
      organizationId: auth.organizationId,
      title: parsed.data.title,
      author: parsed.data.author,
      category: parsed.data.category ?? null,
      isbn: parsed.data.isbn ?? null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      replacementValue: parsed.data.replacementValue ?? null,
      currentCondition: parsed.data.currentCondition,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      publishedYear: parsed.data.publishedYear ?? null,
      publisher: parsed.data.publisher ?? null,
      edition: parsed.data.edition ?? null,
      barcodeValue: codes.barcodeValue,
      qrCodeValue: codes.qrCodeValue,
      barcodeImage: codes.barcodeImage,
      qrCodeImage: codes.qrCodeImage,
    },
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "CREATE",
    entityType: "Book",
    entityId: book.id,
    description: `Created book "${book.title}"`,
    newData: serialize(book),
    ipAddress,
    userAgent,
    bookId: book.id,
  });

  return NextResponse.json({ data: serialize(book) }, { status: 201 });
}
