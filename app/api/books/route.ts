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
import { sendNewBookAnnouncement } from "@/lib/services/book-announcements";
import { attachCopyStats, createBookCopies } from "@/lib/services/book-copies";
import { bookCreateSchema } from "@/lib/validations";

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
      orderBy: [{ title: "asc" }, { copyNumber: "asc" }],
      skip,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  const booksWithStats = await attachCopyStats(books);

  return NextResponse.json(
    serialize(paginatedResponse(booksWithStats, total, page, limit))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bookCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { quantity, notifyMode, notifyMessage, selectedBorrowerIds, ...bookData } =
    parsed.data;
  const { ipAddress, userAgent } = getRequestMeta(request);

  const { books } = await createBookCopies({
    organizationId: auth.organizationId,
    quantity: quantity ?? 1,
    data: {
      title: bookData.title,
      author: bookData.author,
      category: bookData.category,
      isbn: bookData.isbn,
      coverImageUrl: bookData.coverImageUrl,
      replacementValue: bookData.replacementValue,
      currentCondition: bookData.currentCondition,
      status: bookData.status,
      notes: bookData.notes,
      publishedYear: bookData.publishedYear,
      publisher: bookData.publisher,
      edition: bookData.edition,
    },
  });

  const book = books[0];

  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { name: true },
  });

  const announcement = await sendNewBookAnnouncement({
    organizationId: auth.organizationId,
    bookTitle: book.title,
    bookAuthor: book.author,
    notifyMode: notifyMode ?? "NONE",
    notifyMessage,
    selectedBorrowerIds,
    libraryName: organization?.name,
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "CREATE",
    entityType: "Book",
    entityId: book.id,
    description:
      books.length > 1
        ? `Created ${books.length} copies of "${book.title}"`
        : `Created book "${book.title}"`,
    newData: serialize({ count: books.length, books }),
    ipAddress,
    userAgent,
    bookId: book.id,
  });

  return NextResponse.json(
    {
      data: serialize({
        book,
        copiesCreated: books.length,
        books,
        announcement,
      }),
    },
    { status: 201 }
  );
}
