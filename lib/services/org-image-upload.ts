import { prisma } from "@/lib/prisma";
import {
  ensureDriveFolder,
  MAX_COVER_BYTES,
  uploadBookCoverToDrive,
} from "@/lib/google-drive";
import { isVercelBlobConfigured, uploadToBlob } from "@/lib/vercel-blob";

export const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UploadedOrgImage = {
  url: string;
  storage: "google-drive" | "vercel-blob";
};

/**
 * Google Drive is per-tenant (each library brings their own OAuth
 * connection), so it isn't guaranteed to be configured. Vercel Blob is
 * platform-wide and always available, so it's the fallback whenever a
 * tenant hasn't connected Drive — uploads should never hard-fail just
 * because Drive isn't set up.
 */
export async function uploadOrganizationImage(input: {
  organizationId: string;
  file: File;
  fileNamePrefix: string;
}): Promise<UploadedOrgImage> {
  if (!ACCEPTED_IMAGE_TYPES.has(input.file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or GIF image");
  }

  if (input.file.size > MAX_COVER_BYTES) {
    throw new Error("Image must be smaller than 5 MB");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const safeName = input.file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const fileName = `${input.fileNamePrefix}-${Date.now()}-${safeName || "upload.jpg"}`;

  const integration = await prisma.organizationIntegration.findUnique({
    where: { organizationId: input.organizationId },
  });

  if (integration?.googleRefreshToken) {
    const folderId = await ensureDriveFolder(integration);
    const uploaded = await uploadBookCoverToDrive({
      integration,
      fileName,
      mimeType: input.file.type,
      buffer,
      folderId,
    });

    return { url: uploaded.url, storage: "google-drive" };
  }

  if (isVercelBlobConfigured()) {
    const uploaded = await uploadToBlob({
      pathname: `${input.organizationId}/${fileName}`,
      buffer,
      contentType: input.file.type,
    });

    return { url: uploaded.url, storage: "vercel-blob" };
  }

  throw new Error(
    "Image uploads aren't available right now. Connect Google Drive in Settings → Integrations, or contact support to enable storage."
  );
}
