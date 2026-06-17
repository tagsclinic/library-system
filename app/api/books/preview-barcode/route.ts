import { NextResponse } from "next/server";

import { isErrorResponse, requireAuth, serialize } from "@/lib/api-helpers";
import { canManageBooks } from "@/lib/auth";
import { generateUniqueBarcodeValue } from "@/lib/services/barcode";

export async function GET() {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const barcodeValue = await generateUniqueBarcodeValue(auth.organizationId);

  return NextResponse.json({
    data: serialize({ barcodeValue }),
  });
}
