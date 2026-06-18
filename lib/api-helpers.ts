import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { Prisma, UserRole } from "@prisma/client";

import {
  getBorrowerForUser,
  getBorrowerIdFromUser,
  getBorrowerOrganizationId,
  isBorrowerAccount,
  isBorrowerApproved,
} from "@/lib/borrower-auth";
import { resolveMembership } from "@/lib/membership";
import { isSuperAdmin } from "@/lib/platform";
import { markOverdueLoans } from "@/lib/overdue";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: User;
  role: UserRole;
  organizationId: string;
};

export async function requirePlatformAuth(): Promise<
  { user: User } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSuperAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { userId: user.id },
  });

  if (!platformUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user };
}

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId, role } = await resolveMembership(user);
  if (!organizationId) {
    return NextResponse.json(
      { error: "No organization assigned to user" },
      { status: 403 }
    );
  }

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  await markOverdueLoans(organizationId);

  return { user, role, organizationId };
}

export async function requireOrgAdmin(): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (auth.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return auth;
}

export type BorrowerAuthContext = {
  user: User;
  borrowerId: string;
  organizationId: string;
};

export async function requireBorrowerAuth(): Promise<
  BorrowerAuthContext | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isBorrowerAccount(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const borrowerId = getBorrowerIdFromUser(user);
  const organizationId = getBorrowerOrganizationId(user);

  if (!borrowerId || !organizationId) {
    return NextResponse.json({ error: "Invalid borrower session" }, { status: 403 });
  }

  const borrower = await getBorrowerForUser(user);
  if (!borrower || borrower.organizationId !== organizationId) {
    return NextResponse.json({ error: "Borrower account not found" }, { status: 403 });
  }

  return { user, borrowerId, organizationId };
}

export async function requireApprovedBorrowerAuth(): Promise<
  BorrowerAuthContext | NextResponse
> {
  const auth = await requireBorrowerAuth();
  if (isErrorResponse(auth)) return auth;

  const borrower = await getBorrowerForUser(auth.user);
  if (!borrower || !isBorrowerApproved(borrower.status)) {
    return NextResponse.json(
      {
        error:
          "Your account is pending approval. You will be able to reserve books once a librarian approves your request.",
      },
      { status: 403 }
    );
  }

  return auth;
}

export function isErrorResponse(
  value: AuthContext | BorrowerAuthContext | { user: User } | NextResponse
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
