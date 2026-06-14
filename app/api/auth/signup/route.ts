import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import {
  deleteOrganization,
  linkAdminMember,
  provisionOrganization,
} from "@/lib/services/organization-provision";
import { createAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
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

    const admin = createAdminClient();

    const organization = await provisionOrganization({
      libraryName,
      adminEmail: normalizedEmail,
      adminFullName: fullName.trim(),
    });

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          organization_id: organization.id,
          role: UserRole.ADMIN,
          full_name: fullName.trim(),
        },
      });

    if (authError || !authData.user) {
      await deleteOrganization(organization.id);
      const msg = authError?.message ?? "";
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("registered")
      ) {
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

    try {
      await linkAdminMember({
        organizationId: organization.id,
        userId: authData.user.id,
        email: normalizedEmail,
        fullName: fullName.trim(),
      });
    } catch {
      await admin.auth.admin.deleteUser(authData.user.id);
      await deleteOrganization(organization.id);
      return NextResponse.json(
        { error: "Failed to finish account setup. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          organizationId: organization.id,
          organizationName: organization.name,
          email: normalizedEmail,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    const message =
      error instanceof Error && error.message.includes("SERVICE_ROLE")
        ? "Account signup is not configured on this server"
        : "Something went wrong. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
