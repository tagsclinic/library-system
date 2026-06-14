import { NextResponse, type NextRequest } from "next/server";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { searchSchema } from "@/lib/validations";

interface SearchResult {
  type: "book" | "borrower" | "loan";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;
  const orgFilter = { organizationId, ...notDeleted() };
  const { searchParams } = request.nextUrl;
  const parsed = searchSchema.safeParse({
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "all",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }

  const { q, type } = parsed.data;
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 10)
  );

  const perTypeLimit =
    type === "all" ? Math.ceil(limit / 3) : limit;
  const results: SearchResult[] = [];

  if (type === "all" || type === "books") {
    let books = await prisma.book.findMany({
      where: {
        ...orgFilter,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
          { isbn: { contains: q, mode: "insensitive" } },
          { barcodeValue: { contains: q, mode: "insensitive" } },
          { qrCodeValue: { contains: q, mode: "insensitive" } },
        ],
      },
      take: perTypeLimit,
      orderBy: { title: "asc" },
    });

    if (type === "all" && books.length === 0) {
      const exactIsbn = await prisma.book.findFirst({
        where: { ...orgFilter, isbn: q },
      });
      if (exactIsbn) books = [exactIsbn];
    }

    if (type === "all" && books.length === 0) {
      const exactBarcode = await prisma.book.findFirst({
        where: {
          ...orgFilter,
          OR: [{ barcodeValue: q }, { qrCodeValue: q }],
        },
      });
      if (exactBarcode) books = [exactBarcode];
    }

    results.push(
      ...books.map((book) => ({
        type: "book" as const,
        id: book.id,
        title: book.title,
        subtitle: book.author,
        href: `/books/${book.id}`,
      }))
    );
  }

  if (type === "all" || type === "borrowers") {
    const borrowers = await prisma.borrower.findMany({
      where: {
        ...orgFilter,
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: perTypeLimit,
      orderBy: { fullName: "asc" },
    });

    results.push(
      ...borrowers.map((borrower) => ({
        type: "borrower" as const,
        id: borrower.id,
        title: borrower.fullName,
        subtitle: borrower.phone,
        href: `/borrowers/${borrower.id}`,
      }))
    );
  }

  if (type === "all" || type === "loans") {
    const loans = await prisma.loan.findMany({
      where: {
        ...orgFilter,
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          {
            book: {
              ...orgFilter,
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { isbn: { contains: q, mode: "insensitive" } },
                { barcodeValue: { contains: q, mode: "insensitive" } },
                { qrCodeValue: { contains: q, mode: "insensitive" } },
              ],
            },
          },
          {
            borrower: {
              ...orgFilter,
              fullName: { contains: q, mode: "insensitive" },
            },
          },
        ],
      },
      take: perTypeLimit,
      orderBy: { checkoutDate: "desc" },
      include: {
        book: {
          select: { id: true, title: true, author: true, barcodeValue: true },
        },
        borrower: { select: { id: true, fullName: true, phone: true } },
      },
    });

    results.push(
      ...loans.map((loan) => ({
        type: "loan" as const,
        id: loan.id,
        title: loan.book.title,
        subtitle: `${loan.borrower.fullName} · ${loan.status}`,
        href: `/checkin?loan=${loan.id}`,
        book: loan.book,
        borrower: loan.borrower,
        status: loan.status,
        checkoutDate: loan.checkoutDate,
        dueDate: loan.dueDate,
        checkoutCondition: loan.checkoutCondition,
        checkoutNotes: loan.checkoutNotes,
      }))
    );
  }

  const data = results.slice(0, limit);

  return NextResponse.json(
    serialize({
      data,
      query: q,
      type,
      total: data.length,
      results: {
        books: data.filter((r) => r.type === "book"),
        borrowers: data.filter((r) => r.type === "borrower"),
        loans: data.filter((r) => r.type === "loan"),
      },
    })
  );
}
