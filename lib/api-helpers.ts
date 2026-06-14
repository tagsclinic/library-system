import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { Prisma, type UserRole } from "@prisma/client";

import { getUserRole } from "@/lib/auth";
import { getOrganizationId, requireOrganization } from "@/lib/organization";
import { markOverdueLoans } from "@/lib/overdue";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: User;
  role: UserRole;
  organizationId: string;
};

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = getOrganizationId(user);
  if (!organizationId) {
    return NextResponse.json(
      { error: "No organization assigned to user" },
      { status: 403 }
    );
  }

  try {
    await requireOrganization(user);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  await markOverdueLoans(organizationId);

  return { user, role: getUserRole(user), organizationId };
}

export function isErrorResponse(
  value: AuthContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20)
  );

  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getRequestMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function validationError(error: { flatten: () => unknown }) {
  return NextResponse.json({ error: error.flatten() }, { status: 400 });
}

export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      val instanceof Prisma.Decimal ? val.toNumber() : val
    )
  ) as T;
}

export async function getAppSetting(
  organizationId: string,
  key: string
): Promise<string | null> {
  const setting = await prisma.appSettings.findUnique({
    where: { organizationId_key: { organizationId, key } },
  });
  return setting?.value ?? null;
}

export async function getOrgSettings(organizationId: string) {
  const settings = await prisma.appSettings.findMany({
    where: { organizationId },
  });
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export function notDeleted() {
  return { deletedAt: null };
}
