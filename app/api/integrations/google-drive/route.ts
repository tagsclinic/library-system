import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import { isGoogleDriveConfigured } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";
import { googleDriveCredentialsSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const integration = await prisma.organizationIntegration.findUnique({
    where: { organizationId: auth.organizationId },
  });

  return NextResponse.json({
    data: {
      configured: isGoogleDriveConfigured(integration),
      hasTenantCredentials: Boolean(integration?.googleClientId),
      clientId: integration?.googleClientId ?? null,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/integrations/google-drive/callback`,
      connected: Boolean(integration?.googleRefreshToken),
      email: integration?.googleAccountEmail ?? null,
      folderName: integration?.googleDriveFolderName ?? "LibraryInventory",
      connectedAt: integration?.googleConnectedAt ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const parsed = googleDriveCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const integration = await prisma.organizationIntegration.upsert({
    where: { organizationId: auth.organizationId },
    create: {
      organizationId: auth.organizationId,
      googleClientId: parsed.data.clientId.trim(),
      googleClientSecret: parsed.data.clientSecret.trim(),
    },
    update: {
      googleClientId: parsed.data.clientId.trim(),
      googleClientSecret: parsed.data.clientSecret.trim(),
      googleRefreshToken: null,
      googleAccessToken: null,
      googleTokenExpiry: null,
      googleAccountEmail: null,
      googleDriveFolderId: null,
      googleConnectedAt: null,
    },
  });

  return NextResponse.json({
    data: {
      configured: isGoogleDriveConfigured(integration),
      hasTenantCredentials: true,
      clientId: integration.googleClientId,
      connected: false,
    },
  });
}

export async function DELETE() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const integration = await prisma.organizationIntegration.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!integration) {
    return NextResponse.json({ data: { success: true } });
  }

  if (integration.googleClientId || integration.googleClientSecret) {
    await prisma.organizationIntegration.update({
      where: { organizationId: auth.organizationId },
      data: {
        googleRefreshToken: null,
        googleAccessToken: null,
        googleTokenExpiry: null,
        googleAccountEmail: null,
        googleDriveFolderId: null,
        googleConnectedAt: null,
      },
    });
  } else {
    await prisma.organizationIntegration.delete({
      where: { organizationId: auth.organizationId },
    });
  }

  return NextResponse.json({ data: { success: true } });
}
