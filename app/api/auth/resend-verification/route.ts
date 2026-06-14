import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createSignupClient } from "@/lib/supabase/signup-client";

function authRedirectUrl(path = "/auth/callback?next=/dashboard"): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Prefer auto-confirming existing unverified accounts (no email delivery needed).
    if (serviceKey) {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const user = data.users.find(
        (u) => u.email?.toLowerCase() === email
      );

      if (user && !user.email_confirmed_at) {
        const { error: updateError } = await admin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        return NextResponse.json({
          data: {
            confirmed: true,
            message: "Your email has been confirmed. You can sign in now.",
          },
        });
      }

      if (user?.email_confirmed_at) {
        return NextResponse.json({
          data: {
            confirmed: true,
            message: "Your email is already confirmed. Try signing in.",
          },
        });
      }
    }

    const auth = createSignupClient();
    const { error: resendError } = await auth.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    });

    if (resendError) {
      return NextResponse.json({ error: resendError.message }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        confirmed: false,
        message: "Verification email sent. Check your inbox and spam folder.",
      },
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Could not send verification email. Try again later." },
      { status: 500 }
    );
  }
}
