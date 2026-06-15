import { NextResponse } from "next/server";

import { isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import { getGoogleAuthUrl, isGoogleDriveConfigured } from "@/lib/google-drive";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive is not configured on this server" },
      { status: 503 }
    );
  }

  const url = getGoogleAuthUrl(auth.organizationId);
  return NextResponse.json({ data: { url } });
}
