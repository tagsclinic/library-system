import { BookStatus, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/services/borrower-account";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ error: "Library not found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 48, 100);

  const where: Prisma.BookWhereInput = {
    organizationId: organization.id,
    deletedAt: null,
    status: { not: BookStatus.ARCHIVED },
  };

  if (category && category !== "all") {
    where.category = category;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
      { isbn: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const books = await prisma.book.findMany({
    where,
    orderBy: { title: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      author: true,
      category: true,
      isbn: true,
      status: true,
      coverImageUrl: true,
      publishedYear: true,
      publisher: true,
    },
  });

  const categories = await prisma.book.findMany({
    where: {
      organizationId: organization.id,
      deletedAt: null,
      category: { not: null },
    },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  return NextResponse.json(
    serialize({
      data: {
        books,
        categories: categories
          .map((row) => row.category)
          .filter(Boolean) as string[],
      },
    })
  );
}
