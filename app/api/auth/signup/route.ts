import { NextRequest, NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";

import {
  deleteOrganization,
  linkAdminMember,
  provisionOrganization,
} from "@/lib/services/organization-provision";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSignupClient } from "@/lib/supabase/signup-client";
import { signupSchema } from "@/lib/validations";

function signupErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database connection failed. Check DATABASE_URL and DIRECT_URL.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Database is not initialized. Run prisma db push against your production database.";
    }
    if (error.code === "P1001") {
      return "Database is unreachable. Verify your Supabase connection strings.";
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("SERVICE_ROLE")) {
      return "Account signup is not configured on this server.";
    }
    if (error.message.includes("NEXT_PUBLIC_SUPABASE")) {
      return "Supabase is not configured on this server.";
    }
  }

  return "Something went wrong. Please try again.";
}

function isDuplicateEmailError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists")
  );
}

async function deleteAuthUser(userId: string) {
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Service role optional for cleanup.
  }
}

async function createAuthUser(input: {
  email: string;
  password: string;
  organizationId: string;
  fullName: string;
}) {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (adminKey) {
    const admin = createAdminClient();
    return admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        organization_id: input.organizationId,
        role: UserRole.ADMIN,
        full_name: input.fullName,
      },
    });
  }

  const auth = createSignupClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return auth.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        organization_id: input.organizationId,
        role: UserRole.ADMIN,
        full_name: input.fullName,
      },
      ...(appUrl ? { emailRedirectTo: `${appUrl}/login` } : {}),
    },
  });
}

export async function POST(request: NextRequest) {
  let organizationId: string | null = null;
  let authUserId: string | null = null;

  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { libraryName, fullName, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const organization = await provisionOrganization({
      libraryName,
      adminEmail: normalizedEmail,
      adminFullName: fullName.trim(),
    });
    organizationId = organization.id;

    const { data: authData, error: authError } = await createAuthUser({
      email: normalizedEmail,
      password,
      organizationId: organization.id,
      fullName: fullName.trim(),
    });

    if (authError || !authData.user) {
      await deleteOrganization(organization.id);
      organizationId = null;

      const msg = authError?.message ?? "";
      if (isDuplicateEmailError(msg)) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: msg || "Failed to create your account. Please try again." },
        { status: 400 }
      );
    }

    authUserId = authData.user.id;

    try {
      await linkAdminMember({
        organizationId: organization.id,
        userId: authData.user.id,
        email: normalizedEmail,
        fullName: fullName.trim(),
      });
    } catch (memberError) {
      console.error("Signup member link error:", memberError);
      if (authUserId) await deleteAuthUser(authUserId);
      await deleteOrganization(organization.id);
      organizationId = null;
      authUserId = null;

      return NextResponse.json(
        { error: "Failed to finish account setup. Please try again." },
        { status: 500 }
      );
    }

    const needsEmailConfirmation =
      "session" in authData ? authData.session == null : false;

    return NextResponse.json(
      {
        data: {
          organizationId: organization.id,
          organizationName: organization.name,
          email: normalizedEmail,
          needsEmailConfirmation,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);

    if (authUserId) await deleteAuthUser(authUserId);
    if (organizationId) {
      try {
        await deleteOrganization(organizationId);
      } catch (cleanupError) {
        console.error("Signup cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: signupErrorMessage(error) },
      { status: 500 }
    );
  }
}
