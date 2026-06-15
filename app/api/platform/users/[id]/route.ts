import { NextRequest, NextResponse } from "next/server";

import {
  isErrorResponse,
  requirePlatformAuth,
  serialize,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  deletePlatformAuthUser,
  removePlatformUserRecord,
  syncAuthUserMetadata,
  upsertOrganizationMember,
  upsertPlatformUserRecord,
} from "@/lib/services/platform-users";
import { platformUserUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const { id: userId } = await context.params;

  const [member, platformUser] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, deletedAt: true },
        },
      },
    }),
    prisma.platformUser.findUnique({ where: { userId } }),
  ]);

  if (!member && !platformUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(
    serialize({
      data: {
        userId,
        email: member?.email ?? platformUser?.email,
        fullName: member?.fullName,
        role: member?.role,
        organizationId: member?.organizationId ?? null,
        organization: member?.organization ?? null,
        isSuperAdmin: !!platformUser,
      },
    })
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const { id: userId } = await context.params;
  const body = await request.json();
  const parsed = platformUserUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId },
  });
  const existingPlatform = await prisma.platformUser.findUnique({
    where: { userId },
  });

  if (!existingMember && !existingPlatform) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const {
    fullName,
    organizationId,
    role,
    password,
    isSuperAdmin,
  } = parsed.data;

  if (organizationId) {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
    });
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
  }

  try {
    const email =
      existingMember?.email ?? existingPlatform?.email ?? auth.user.email ?? "";

    await syncAuthUserMetadata({
      userId,
      email,
      fullName: fullName ?? existingMember?.fullName,
      organizationId:
        organizationId !== undefined
          ? organizationId
          : existingMember?.organizationId,
      role: role ?? existingMember?.role,
      isSuperAdmin:
        isSuperAdmin !== undefined ? isSuperAdmin : !!existingPlatform,
      password,
    });

    const targetOrgId =
      organizationId !== undefined
        ? organizationId
        : existingMember?.organizationId;

    if (targetOrgId && (role || fullName || organizationId !== undefined)) {
      await upsertOrganizationMember({
        organizationId: targetOrgId,
        userId,
        email,
        fullName: fullName ?? existingMember?.fullName,
        role: role ?? existingMember?.role ?? "VIEWER",
      });
    }

    if (organizationId !== undefined && organizationId !== existingMember?.organizationId) {
      if (existingMember && existingMember.organizationId !== organizationId) {
        await prisma.organizationMember.delete({
          where: { id: existingMember.id },
        });
      }
      if (organizationId) {
        await upsertOrganizationMember({
          organizationId,
          userId,
          email,
          fullName: fullName ?? existingMember?.fullName,
          role: role ?? existingMember?.role ?? "VIEWER",
        });
      }
    }

    if (isSuperAdmin === true) {
      await upsertPlatformUserRecord({ userId, email });
    } else if (isSuperAdmin === false) {
      await removePlatformUserRecord(userId);
    }

    return NextResponse.json(serialize({ data: { success: true } }));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const { id: userId } = await context.params;

  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId },
  });
  const existingPlatform = await prisma.platformUser.findUnique({
    where: { userId },
  });

  if (!existingMember && !existingPlatform) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await deletePlatformAuthUser(userId);
    await prisma.organizationMember.deleteMany({ where: { userId } });
    await removePlatformUserRecord(userId);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete user",
      },
      { status: 400 }
    );
  }
}
