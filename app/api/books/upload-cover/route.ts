import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, requireAuth, serialize } from "@/lib/api-helpers";
import { canManageBooks } from "@/lib/auth";
import {
  ensureDriveFolder,
  MAX_COVER_BYTES,
  uploadBookCoverToDrive,
} from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageBooks(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const integration = await prisma.organizationIntegration.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!integration?.googleRefreshToken) {
    return NextResponse.json(
      {
        error:
          "Connect Google Drive in Settings → Integrations before uploading cover photos.",
      },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Upload a JPG, PNG, WebP, or GIF image" },
      { status: 400 }
    );
  }

  if (file.size > MAX_COVER_BYTES) {
    return NextResponse.json(
      { error: "Cover image must be smaller than 5 MB" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const folderId = await ensureDriveFolder(integration);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
    const fileName = `book-cover-${Date.now()}-${safeName || "cover.jpg"}`;

    const uploaded = await uploadBookCoverToDrive({
      integration,
      fileName,
      mimeType: file.type,
      buffer,
      folderId,
    });

    if (integration.googleAccessToken) {
      await prisma.organizationIntegration.update({
        where: { organizationId: auth.organizationId },
        data: {
          googleAccessToken: integration.googleAccessToken,
          googleTokenExpiry: integration.googleTokenExpiry,
        },
      });
    }

    return NextResponse.json(
      serialize({
        data: {
          coverImageUrl: uploaded.url,
          fileId: uploaded.fileId,
        },
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload cover to Google Drive",
      },
      { status: 400 }
    );
  }
}
