import { NextResponse, type NextRequest } from "next/server";

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
import { generateBarcodeSvg, generateQrDataUrl } from "@/lib/services/barcode";

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

  const barcodeImage = generateBarcodeSvg(existing.barcodeValue);
  const qrCodeImage = await generateQrDataUrl(existing.qrCodeValue);

  const book = await prisma.book.update({
    where: { id },
    data: { barcodeImage, qrCodeImage },
  });

  const { ipAddress, userAgent } = getRequestMeta(request);
  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    action: "UPDATE",
    entityType: "Book",
    entityId: book.id,
    description: `Generated barcode image for "${book.title}"`,
    ipAddress,
    userAgent,
    bookId: book.id,
  });

  return NextResponse.json({ data: serialize(book) });
}
