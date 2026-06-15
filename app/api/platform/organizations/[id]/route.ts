import { NextRequest, NextResponse } from "next/server";

import {
  isErrorResponse,
  requirePlatformAuth,
  serialize,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { platformOrganizationUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: { orderBy: { createdAt: "desc" } },
      _count: {
        select: {
          books: true,
          borrowers: true,
          loans: true,
          members: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json(serialize({ data: organization }));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = platformOrganizationUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { name, subscriptionPlan, suspended } = parsed.data;

  const organization = await prisma.organization.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(subscriptionPlan !== undefined ? { subscriptionPlan } : {}),
      ...(suspended !== undefined
        ? { deletedAt: suspended ? new Date() : null }
        : {}),
    },
  });

  return NextResponse.json(serialize({ data: organization }));
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  await prisma.organization.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ data: { success: true } });
}
