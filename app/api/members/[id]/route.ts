import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import {
  deleteOrganizationMember,
  updateOrganizationMember,
} from "@/lib/services/org-members";
import { orgMemberUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const { id: userId } = await context.params;
  const body = await request.json();
  const parsed = orgMemberUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const member = await updateOrganizationMember({
      organizationId: auth.organizationId,
      userId,
      ...parsed.data,
    });

    return NextResponse.json({ data: member });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update member",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const { id: userId } = await context.params;

  try {
    await deleteOrganizationMember({
      organizationId: auth.organizationId,
      userId,
      actorUserId: auth.user.id,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove member",
      },
      { status: 400 }
    );
  }
}
