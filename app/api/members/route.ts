import { NextRequest, NextResponse } from "next/server";

import {
  isErrorResponse,
  requireOrgAdmin,
  serialize,
} from "@/lib/api-helpers";
import {
  createOrganizationMember,
  listOrganizationMembers,
} from "@/lib/services/org-members";
import { orgMemberCreateSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const members = await listOrganizationMembers(auth.organizationId);
  return NextResponse.json(serialize({ data: members }));
}

export async function POST(request: NextRequest) {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const parsed = orgMemberCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const member = await createOrganizationMember({
      organizationId: auth.organizationId,
      ...parsed.data,
    });

    return NextResponse.json(serialize({ data: member }), { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add team member";
    const status = message.toLowerCase().includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
