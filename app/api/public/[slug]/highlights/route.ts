import { BookStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/services/borrower-account";

type RouteContext = { params: Promise<{ slug: string }> };

const BOOK_CARD_SELECT = {
  id: true,
  title: true,
  author: true,
  category: true,
  status: true,
  coverImageUrl: true,
} as const;

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ error: "Library not found" }, { status: 404 });
  }

  const catalogWhere = {
    organizationId: organization.id,
    deletedAt: null,
    status: { not: BookStatus.ARCHIVED },
  };

  const newArrivals = await prisma.book.findMany({
    where: catalogWhere,
    orderBy: { createdAt: "desc" },
    take: 12,
    select: BOOK_CARD_SELECT,
  });

  const mostBorrowed = await prisma.loan.groupBy({
    by: ["bookId"],
    where: {
      organizationId: organization.id,
      deletedAt: null,
      book: catalogWhere,
    },
    _count: { bookId: true },
    orderBy: { _count: { bookId: "desc" } },
    take: 12,
  });

  const popularBooksById = new Map(
    (
      await prisma.book.findMany({
        where: { id: { in: mostBorrowed.map((row) => row.bookId) } },
        select: BOOK_CARD_SELECT,
      })
    ).map((book) => [book.id, book])
  );

  const popular = mostBorrowed
    .map((row) => popularBooksById.get(row.bookId))
    .filter((book): book is NonNullable<typeof book> => Boolean(book));

  return NextResponse.json(
    serialize({
      data: { newArrivals, popular },
    })
  );
}
