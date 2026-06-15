import { Readable } from "node:stream";

import { google } from "googleapis";
import type { OrganizationIntegration } from "@prisma/client";

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

const FOLDER_NAME = "LibraryInventory";
const MAX_COVER_BYTES = 5 * 1024 * 1024;

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function getGoogleRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }
  return `${base}/api/integrations/google-drive/callback`;
}

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured on this server");
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleRedirectUri());
}

export function encodeOAuthState(organizationId: string): string {
  return Buffer.from(JSON.stringify({ organizationId })).toString("base64url");
}

export function decodeOAuthState(state: string): { organizationId: string } {
  const parsed = JSON.parse(
    Buffer.from(state, "base64url").toString("utf8")
  ) as { organizationId?: string };

  if (!parsed.organizationId) {
    throw new Error("Invalid OAuth state");
  }

  return { organizationId: parsed.organizationId };
}

export function getGoogleAuthUrl(organizationId: string): string {
  const oauth2 = getGoogleOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    state: encodeOAuthState(organizationId),
  });
}

export async function exchangeGoogleCode(code: string) {
  const oauth2 = getGoogleOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

function getAuthenticatedClient(integration: OrganizationIntegration) {
  if (!integration.googleRefreshToken) {
    throw new Error("Google Drive is not connected for this library");
  }

  const oauth2 = getGoogleOAuthClient();
  oauth2.setCredentials({
    refresh_token: integration.googleRefreshToken,
    access_token: integration.googleAccessToken ?? undefined,
    expiry_date: integration.googleTokenExpiry?.getTime(),
  });

  return oauth2;
}

export async function getGoogleAccountEmail(
  integration: OrganizationIntegration
): Promise<string | null> {
  const auth = getAuthenticatedClient(integration);
  const oauth2 = google.oauth2({ version: "v2", auth });
  const { data } = await oauth2.userinfo.get();
  return data.email ?? null;
}

export async function ensureDriveFolder(
  integration: OrganizationIntegration
): Promise<string> {
  if (integration.googleDriveFolderId) {
    return integration.googleDriveFolderId;
  }

  const auth = getAuthenticatedClient(integration);
  const drive = google.drive({ version: "v3", auth });

  const folder = await drive.files.create({
    requestBody: {
      name: integration.googleDriveFolderName ?? FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  if (!folder.data.id) {
    throw new Error("Failed to create Google Drive folder");
  }

  return folder.data.id;
}

export async function uploadBookCoverToDrive(input: {
  integration: OrganizationIntegration;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId: string;
}) {
  if (input.buffer.length > MAX_COVER_BYTES) {
    throw new Error("Cover image must be smaller than 5 MB");
  }

  const auth = getAuthenticatedClient(input.integration);
  const drive = google.drive({ version: "v3", auth });

  const uploaded = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [input.folderId],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.buffer),
    },
    fields: "id, webViewLink, webContentLink, thumbnailLink",
  });

  const fileId = uploaded.data.id;
  if (!fileId) {
    throw new Error("Failed to upload cover image to Google Drive");
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  const url =
    uploaded.data.webContentLink ??
    uploaded.data.webViewLink ??
    `https://drive.google.com/uc?export=view&id=${fileId}`;

  return { fileId, url };
}

export { MAX_COVER_BYTES };
