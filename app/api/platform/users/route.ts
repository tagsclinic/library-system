import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import {
  isErrorResponse,
  requirePlatformAuth,
  serialize,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  createPlatformAuthUser,
  upsertOrganizationMember,
  upsertPlatformUserRecord,
} from "@/lib/services/platform-users";
import { platformUserCreateSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const organizationId = request.nextUrl.searchParams.get("organizationId");

  const members = await prisma.organizationMember.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { fullName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, deletedAt: true },
      },
    },
  });

  const platformUsers = await prisma.platformUser.findMany({
    orderBy: { createdAt: "desc" },
  });
  const memberUserIds = new Set(members.map((m) => m.userId));

  const data: Array<{
    userId: string;
    email: string;
    fullName: string | null;
    role: UserRole;
    organizationId: string | null;
    organization: (typeof members)[number]["organization"] | null;
    isSuperAdmin: boolean;
    createdAt: Date;
  }> = members.map((member) => ({
    userId: member.userId,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
    organizationId: member.organizationId,
    organization: member.organization,
    isSuperAdmin: platformUsers.some((p) => p.userId === member.userId),
    createdAt: member.createdAt,
  }));

  for (const superAdmin of platformUsers) {
    if (!memberUserIds.has(superAdmin.userId)) {
      data.unshift({
        userId: superAdmin.userId,
        email: superAdmin.email,
        fullName: "Super Admin",
        role: UserRole.ADMIN,
        organizationId: null,
        organization: null,
        isSuperAdmin: true,
        createdAt: superAdmin.createdAt,
      });
    }
  }

  return NextResponse.json(serialize({ data }));
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const parsed = platformUserCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const {
    email,
    password,
    fullName,
    organizationId,
    role = UserRole.VIEWER,
    isSuperAdmin = false,
  } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

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
    const authUser = await createPlatformAuthUser({
      email: normalizedEmail,
      password,
      fullName,
      organizationId: organizationId ?? null,
      role: organizationId ? role : undefined,
      isSuperAdmin,
    });

    if (organizationId) {
      await upsertOrganizationMember({
        organizationId,
        userId: authUser.id,
        email: normalizedEmail,
        fullName,
        role,
      });
    }

    if (isSuperAdmin) {
      await upsertPlatformUserRecord({
        userId: authUser.id,
        email: normalizedEmail,
      });
    }

    return NextResponse.json(
      serialize({
        data: {
          userId: authUser.id,
          email: normalizedEmail,
          fullName,
          organizationId,
          role,
          isSuperAdmin,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    const status = message.toLowerCase().includes("already")
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
