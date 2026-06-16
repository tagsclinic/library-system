import { NextResponse, type NextRequest } from "next/server";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  const borrower = await prisma.borrower.findFirst({
    where: { id, organizationId: auth.organizationId, ...notDeleted() },
  });

  if (!borrower) {
    return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { id: true, name: true, slug: true },
  });

  const libraryId = borrower.id.slice(-8).toUpperCase();

  return NextResponse.json({
    data: serialize({
      borrower: {
        id: borrower.id,
        fullName: borrower.fullName,
        phone: borrower.phone,
        email: borrower.email,
        status: borrower.status,
      },
      organization,
      card: {
        libraryId,
        qrCodeValue: borrower.id,
        status: borrower.status,
        walletReady: {
          passType: "library-card",
          serialNumber: borrower.id,
          organizationName: organization?.name ?? "Library",
          appleWalletSupported: false,
        },
      },
    }),
  });
}
