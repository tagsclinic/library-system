import { NextRequest, NextResponse } from "next/server";

import {
  getRequestMeta,
  isErrorResponse,
  notDeleted,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canManageBooks } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { duplicateBookAsNewVolume } from "@/lib/services/book-copies";
import { bookDuplicateVolumeSchema } from "@/lib/validations";

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

  const body = await request.json();
  const parsed = bookDuplicateVolumeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const book = await duplicateBookAsNewVolume({
      organizationId: auth.organizationId,
      sourceBookId: id,
      title: parsed.data.title,
      barcodeValue: parsed.data.barcodeValue,
      isbn: parsed.data.isbn,
    });

    const { ipAddress, userAgent } = getRequestMeta(request);
    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      action: "CREATE",
      entityType: "Book",
      entityId: book.id,
      description: `Created new volume "${book.title}" from "${existing.title}"`,
      newData: serialize(book),
      ipAddress,
      userAgent,
      bookId: book.id,
    });

    return NextResponse.json({ data: serialize(book) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to duplicate book",
      },
      { status: 400 }
    );
  }
}
