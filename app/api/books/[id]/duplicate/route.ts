import { NextRequest, NextResponse } from "next/server";

import {
  getRequestMeta,
  isErrorResponse,
  notDeleted,
  requireAuth,
  serialize,
} from "@/lib/api-helpers";
import { canManageBooks } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { duplicateBookCopies } from "@/lib/services/book-copies";
import { bookDuplicateSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.book.findFirst({
    where: { id, organizationId: auth.organizationId, ...notDeleted() },
  });

  if (!existing) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bookDuplicateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { books, copyGroupId } = await duplicateBookCopies({
      organizationId: auth.organizationId,
      sourceBookId: id,
      copies: parsed.data.copies,
    });

    const { ipAddress, userAgent } = getRequestMeta(request);
    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      action: "CREATE",
      entityType: "Book",
      entityId: books[0].id,
      description: `Duplicated "${existing.title}" — added ${books.length} cop${books.length === 1 ? "y" : "ies"}`,
      newData: serialize({ copyGroupId, books }),
      ipAddress,
      userAgent,
      bookId: books[0].id,
    });

    return NextResponse.json(
      {
        data: serialize({
          books,
          copiesCreated: books.length,
          copyGroupId,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to duplicate book",
      },
      { status: 400 }
    );
  }
}
