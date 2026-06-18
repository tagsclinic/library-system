import { put } from "@vercel/blob";

export function isVercelBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadToBlob(input: {
  pathname: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ url: string }> {
  const blob = await put(input.pathname, input.buffer, {
    access: "public",
    contentType: input.contentType,
    addRandomSuffix: true,
  });

  return { url: blob.url };
}
