import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getUserRole } from "@/lib/auth";
import {
  decodeOAuthState,
  ensureDriveFolder,
  exchangeGoogleCode,
  getGoogleAccountEmail,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";
import { getOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const settingsUrl = `${appUrl}/settings?tab=integrations`;

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

    const integration = await prisma.organizationIntegration.findUnique({
      where: { organizationId },
    });

    if (!isGoogleDriveConfigured(integration)) {
      return NextResponse.redirect(
        `${settingsUrl}&error=${encodeURIComponent("Google OAuth credentials are not configured for this library")}`
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (
      !user ||
      getOrganizationId(user) !== organizationId ||
      getUserRole(user) !== UserRole.ADMIN
    ) {
      return NextResponse.redirect(
        `${settingsUrl}&error=${encodeURIComponent("Session expired or unauthorized. Sign in as an admin and try again.")}`
      );
    }

    const tokens = await exchangeGoogleCode(code, integration);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${settingsUrl}&error=${encodeURIComponent("Google did not return a refresh token. Disconnect and try again.")}`
      );
    }

    const updatedIntegration = await prisma.organizationIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        googleClientId: integration?.googleClientId ?? null,
        googleClientSecret: integration?.googleClientSecret ?? null,
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

    const email = await getGoogleAccountEmail(updatedIntegration);
    const folderId = await ensureDriveFolder(updatedIntegration);

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
