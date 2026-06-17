import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getOrganizationId } from "@/lib/organization";
import { isSuperAdmin } from "@/lib/platform";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Skipping Supabase middleware: NEXT_PUBLIC_SUPABASE_URL or publishable key is not configured."
      );
      return NextResponse.next();
    }

    throw new Error("Missing Supabase environment configuration");
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute =
    pathname.startsWith("/library/") ||
    pathname.startsWith("/api/public/");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/");
  const isPlatformRoute =
    pathname.startsWith("/platform") || pathname.startsWith("/api/platform");
  const isProtectedRoute =
    !isPublicRoute &&
    (pathname.startsWith("/dashboard") ||
    pathname.startsWith("/books") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/checkin") ||
    pathname.startsWith("/renewals") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/borrowers") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/audit") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/reservations") ||
    isPlatformRoute ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")));

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPlatformRoute && !isSuperAdmin(user)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    if (isSuperAdmin(user) && !getOrganizationId(user)) {
      url.pathname = "/platform";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
