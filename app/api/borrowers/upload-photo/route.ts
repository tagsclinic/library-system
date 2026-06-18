import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, requireAuth, serialize } from "@/lib/api-helpers";
import { canManageBorrowers } from "@/lib/auth";
import { uploadOrganizationImage } from "@/lib/services/org-image-upload";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBorrowers(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  try {
    const uploaded = await uploadOrganizationImage({
      organizationId: auth.organizationId,
      file,
      fileNamePrefix: "borrower-photo",
    });

    return NextResponse.json(
      serialize({
        data: { photoUrl: uploaded.url, storage: uploaded.storage },
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload photo",
      },
      { status: 400 }
    );
  }
}
