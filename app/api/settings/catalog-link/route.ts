import { NextResponse } from "next/server";

import { isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { slug: true, publicCatalogEnabled: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const publicUrl = `${base}/library/${organization.slug}`;

  return NextResponse.json({
    data: {
      slug: organization.slug,
      publicUrl,
      enabled: organization.publicCatalogEnabled,
    },
  });
}
