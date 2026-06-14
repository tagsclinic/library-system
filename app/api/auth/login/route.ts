import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      if (error.message === "Invalid API key") {
        console.error("Login failed: Supabase rejected the configured API key");
        return NextResponse.json(
          {
            error:
              "Sign-in is misconfigured on this server. Contact support or try again later.",
          },
          { status: 503 }
        );
      }

      const message =
        error.message === "Invalid login credentials"
          ? "Invalid email or password."
          : error.message === "Email not confirmed"
            ? "Email not confirmed. Use “Confirm my email” below."
            : error.message;

      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        userId: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    const message =
      error instanceof Error ? error.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
