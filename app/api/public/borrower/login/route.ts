import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";
import {
  getBorrowerForUser,
  isBorrowerAccount,
} from "@/lib/borrower-auth";
import { getOrganizationBySlug } from "@/lib/services/borrower-account";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const slug =
    typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";

  if (!slug) {
    return NextResponse.json({ error: "Library slug is required" }, { status: 400 });
  }

  const organization = await getOrganizationBySlug(slug);
  if (!organization) {
    return NextResponse.json({ error: "Library not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase().trim(),
    password: parsed.data.password,
  });

  if (error) {
    const message =
      error.message === "Invalid login credentials"
        ? "Invalid email or password."
        : error.message;
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (!data.user || !isBorrowerAccount(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This login is for library patrons only. Staff should use the main sign-in page." },
      { status: 403 }
    );
  }

  const borrower = await getBorrowerForUser(data.user);
  if (!borrower || borrower.organizationId !== organization.id) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This account is not registered with this library." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    data: {
      borrowerId: borrower.id,
      status: borrower.status,
      organizationSlug: slug,
    },
  });
}
