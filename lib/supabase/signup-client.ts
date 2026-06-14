import { createClient } from "@supabase/supabase-js";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Public auth client for server-side signUp (no service role required). */
export function createSignupClient() {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
