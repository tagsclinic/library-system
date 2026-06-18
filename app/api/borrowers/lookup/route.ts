import { BorrowerStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const MIN_PARTIAL_CODE_LENGTH = 6;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const code = request.nextUrl.searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json(
      { error: "code query parameter is required" },
      { status: 400 }
    );
  }

  // The digital library card's QR encodes the full borrower id; a printed
  // card shows a shorter 8-character suffix of it. endsWith covers both —
  // a full id "ends with" itself — guarded by a minimum length so short
  // codes can't accidentally match an unrelated borrower.
  const borrower = await prisma.borrower.findFirst({
    where: {
      organizationId: auth.organizationId,
      ...notDeleted(),
      status: BorrowerStatus.ACTIVE,
      OR: [
        { phone: code },
        ...(code.length >= MIN_PARTIAL_CODE_LENGTH
          ? [{ id: { endsWith: code, mode: "insensitive" as const } }]
          : []),
      ],
    },
  });

  if (!borrower) {
    return NextResponse.json(
      { error: "No active borrower found for this code" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: serialize(borrower) });
}
