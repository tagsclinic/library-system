import { NextResponse } from "next/server";

import { isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import { isGoogleDriveConfigured } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const integration = await prisma.organizationIntegration.findUnique({
    where: { organizationId: auth.organizationId },
  });

  return NextResponse.json({
    data: {
      configured: isGoogleDriveConfigured(),
      connected: Boolean(integration?.googleRefreshToken),
      email: integration?.googleAccountEmail ?? null,
      folderName: integration?.googleDriveFolderName ?? "LibraryInventory",
      connectedAt: integration?.googleConnectedAt ?? null,
    },
  });
}

export async function DELETE() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  await prisma.organizationIntegration.deleteMany({
    where: { organizationId: auth.organizationId },
  });

  return NextResponse.json({ data: { success: true } });
}
