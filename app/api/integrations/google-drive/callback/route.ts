import { NextRequest, NextResponse } from "next/server";

import {
  decodeOAuthState,
  ensureDriveFolder,
  exchangeGoogleCode,
  getGoogleAccountEmail,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const settingsUrl = `${appUrl}/settings?tab=integrations`;

  if (!isGoogleDriveConfigured()) {
    return NextResponse.redirect(
      `${settingsUrl}&error=${encodeURIComponent("Google Drive is not configured")}`
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}&error=${encodeURIComponent("Google sign-in was cancelled")}`
    );
  }

  try {
    const { organizationId } = decodeOAuthState(state);
    const tokens = await exchangeGoogleCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${settingsUrl}&error=${encodeURIComponent("Google did not return a refresh token. Disconnect and try again.")}`
      );
    }

    const integration = await prisma.organizationIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        googleRefreshToken: tokens.refresh_token,
        googleAccessToken: tokens.access_token ?? null,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        googleConnectedAt: new Date(),
      },
      update: {
        googleRefreshToken: tokens.refresh_token,
        googleAccessToken: tokens.access_token ?? null,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        googleConnectedAt: new Date(),
      },
    });

    const email = await getGoogleAccountEmail(integration);
    const folderId = await ensureDriveFolder(integration);

    await prisma.organizationIntegration.update({
      where: { organizationId },
      data: {
        googleAccountEmail: email,
        googleDriveFolderId: folderId,
      },
    });

    return NextResponse.redirect(`${settingsUrl}&connected=1`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google Drive connection failed";
    return NextResponse.redirect(
      `${settingsUrl}&error=${encodeURIComponent(message)}`
    );
  }
}
