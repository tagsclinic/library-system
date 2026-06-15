import { NextResponse } from "next/server";

import { serialize } from "@/lib/api-helpers";
import { getOrganizationBySlug } from "@/lib/services/borrower-account";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ error: "Library not found" }, { status: 404 });
  }

  return NextResponse.json(serialize({ data: organization }));
}
