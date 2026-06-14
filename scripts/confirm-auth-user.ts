/**
 * Confirms a user's email via Supabase Admin API (no inbox required).
 * Usage: npm run auth:confirm -- admin@tagsclinic.com
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email) {
    console.error("Usage: npm run auth:confirm -- user@example.com");
    process.exit(1);
  }

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }

  const user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  if (user.email_confirmed_at) {
    console.log(`✓ ${email} is already confirmed`);
    process.exit(0);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  if (updateError) {
    console.error("Failed to confirm:", updateError.message);
    process.exit(1);
  }

  console.log(`✓ Confirmed ${email} — they can sign in now`);
}

main();
