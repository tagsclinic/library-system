import { NextResponse } from "next/server";

import { serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/services/borrower-account";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug, id } = await context.params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ error: "Library not found" }, { status: 404 });
  }

  const book = await prisma.book.findFirst({
    where: {
      id,
      organizationId: organization.id,
      deletedAt: null,
    },
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
      edition: true,
      notes: true,
      currentCondition: true,
    },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json(serialize({ data: book }));
}
