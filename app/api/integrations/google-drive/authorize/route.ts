import { NextResponse } from "next/server";

import { isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import { getGoogleAuthUrl, isGoogleDriveConfigured } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const integration = await prisma.organizationIntegration.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!isGoogleDriveConfigured(integration)) {
    return NextResponse.json(
      {
        error:
          "Add your Google OAuth Client ID and Client Secret in Settings → Integrations first.",
      },
      { status: 503 }
    );
  }

  const url = getGoogleAuthUrl(auth.organizationId, integration);
  return NextResponse.json({ data: { url } });
}
