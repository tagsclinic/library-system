import { randomUUID } from "node:crypto";

import type { Book } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateBookCodes, resolveBookCodes } from "@/lib/services/barcode";

export type BookCopyInput = {
  title: string;
  author: string;
  category?: string | null;
  isbn?: string | null;
  coverImageUrl?: string | null;
  replacementValue?: number | null;
  currentCondition: Book["currentCondition"];
  status: Book["status"];
  notes?: string | null;
  publishedYear?: number | null;
  publisher?: string | null;
  edition?: string | null;
};

export async function getNextCopyNumber(copyGroupId: string): Promise<number> {
  const result = await prisma.book.aggregate({
    where: { copyGroupId, deletedAt: null },
    _max: { copyNumber: true },
  });
  return (result._max.copyNumber ?? 0) + 1;
}

export async function createBookCopies(input: {
  organizationId: string;
  data: BookCopyInput;
  quantity: number;
  copyGroupId?: string | null;
}) {
  const quantity = Math.min(Math.max(input.quantity, 1), 50);
  const copyGroupId = input.copyGroupId ?? randomUUID();
  let copyNumber = input.copyGroupId
    ? await getNextCopyNumber(copyGroupId)
    : 1;

  const books: Book[] = [];

  for (let i = 0; i < quantity; i++) {
    const codes = await generateBookCodes(input.organizationId);

    const book = await prisma.book.create({
      data: {
        organizationId: input.organizationId,
        title: input.data.title,
        author: input.data.author,
        category: input.data.category ?? null,
        isbn: input.data.isbn ?? null,
        coverImageUrl: input.data.coverImageUrl || null,
        replacementValue: input.data.replacementValue ?? null,
        currentCondition: input.data.currentCondition,
        status: input.data.status,
        notes: input.data.notes ?? null,
        publishedYear: input.data.publishedYear ?? null,
        publisher: input.data.publisher ?? null,
        edition: input.data.edition ?? null,
        barcodeValue: codes.barcodeValue,
        qrCodeValue: codes.qrCodeValue,
        barcodeImage: codes.barcodeImage,
        qrCodeImage: codes.qrCodeImage,
        copyGroupId,
        copyNumber,
      },
    });

    books.push(book);
    copyNumber += 1;
  }

  return { books, copyGroupId };
}

export async function duplicateBookAsNewVolume(input: {
  organizationId: string;
  sourceBookId: string;
  title: string;
  barcodeValue?: string | null;
  isbn?: string | null;
}) {
  const source = await prisma.book.findFirst({
    where: {
      id: input.sourceBookId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });

  if (!source) {
    throw new Error("Book not found");
  }

  const codes = await resolveBookCodes(input.organizationId, input.barcodeValue);

  const book = await prisma.book.create({
    data: {
      organizationId: input.organizationId,
      title: input.title.trim(),
      author: source.author,
      category: source.category,
      isbn: input.isbn?.trim() || source.isbn,
      coverImageUrl: source.coverImageUrl,
      replacementValue: source.replacementValue,
      currentCondition: source.currentCondition,
      status: source.status,
      notes: source.notes,
      publishedYear: source.publishedYear,
      publisher: source.publisher,
      edition: source.edition,
      barcodeValue: codes.barcodeValue,
      qrCodeValue: codes.qrCodeValue,
      barcodeImage: codes.barcodeImage,
      qrCodeImage: codes.qrCodeImage,
      copyGroupId: null,
      copyNumber: null,
    },
  });

  return book;
}

export async function duplicateBookCopies(input: {
  organizationId: string;
  sourceBookId: string;
  copies?: number;
}) {
  const source = await prisma.book.findFirst({
    where: {
      id: input.sourceBookId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });

  if (!source) {
    throw new Error("Book not found");
  }

  const copyGroupId = source.copyGroupId ?? randomUUID();

  if (!source.copyGroupId) {
    await prisma.book.update({
      where: { id: source.id },
      data: { copyGroupId, copyNumber: 1 },
    });
  }

  return createBookCopies({
    organizationId: input.organizationId,
    copyGroupId,
    quantity: input.copies ?? 1,
    data: {
      title: source.title,
      author: source.author,
      category: source.category,
      isbn: source.isbn,
      coverImageUrl: source.coverImageUrl,
      replacementValue: source.replacementValue
        ? Number(source.replacementValue)
        : null,
      currentCondition: source.currentCondition,
      status: source.status,
      notes: source.notes,
      publishedYear: source.publishedYear,
      publisher: source.publisher,
      edition: source.edition,
    },
  });
}

export async function attachCopyStats<T extends { copyGroupId: string | null; status: Book["status"] }>(
  books: T[]
) {
  const groupIds = [
    ...new Set(books.map((b) => b.copyGroupId).filter(Boolean)),
  ] as string[];

  if (groupIds.length === 0) {
    return books.map((book) => ({
      ...book,
      copyStats: null as { total: number; available: number } | null,
    }));
  }

  const grouped = await prisma.book.groupBy({
    by: ["copyGroupId"],
    where: {
      copyGroupId: { in: groupIds },
      deletedAt: null,
    },
    _count: { _all: true },
  });

  const availableGrouped = await prisma.book.groupBy({
    by: ["copyGroupId"],
    where: {
      copyGroupId: { in: groupIds },
      deletedAt: null,
      status: "AVAILABLE",
    },
    _count: { _all: true },
  });

  const totalMap = new Map(grouped.map((g) => [g.copyGroupId, g._count._all]));
  const availMap = new Map(
    availableGrouped.map((g) => [g.copyGroupId, g._count._all])
  );

  return books.map((book) => {
    if (!book.copyGroupId) {
      return { ...book, copyStats: null };
    }

    return {
      ...book,
      copyStats: {
        total: totalMap.get(book.copyGroupId) ?? 1,
        available: availMap.get(book.copyGroupId) ?? 0,
      },
    };
  });
}

export async function getSiblingCopies(
  organizationId: string,
  copyGroupId: string | null,
  excludeId?: string
) {
  if (!copyGroupId) return [];

  return prisma.book.findMany({
    where: {
      organizationId,
      copyGroupId,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { copyNumber: "asc" },
    select: {
      id: true,
      copyNumber: true,
      barcodeValue: true,
      status: true,
      currentCondition: true,
    },
  });
}
