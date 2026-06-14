#!/usr/bin/env tsx
/**
 * Validate Supabase env vars in .env.local.
 * Usage: npm run validate:supabase-env
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function projectRefFromJwt(key: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1] ?? "", "base64url").toString()
    ) as { ref?: string };
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

async function testAuthKey(
  url: string,
  key: string,
  label: string
): Promise<boolean> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "validation-check@example.com",
      password: "not-a-real-password",
    }),
  });

  const body = (await res.json()) as { msg?: string; message?: string };
  const message = body.msg ?? body.message ?? "";

  if (message === "Invalid API key") {
    console.error(`✗ ${label}: Invalid API key`);
    return false;
  }

  console.log(`✓ ${label}: key accepted by Supabase`);
  return true;
}

async function testServiceRole(url: string, key: string): Promise<boolean> {
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (res.status === 401) {
    console.error("✗ Service role key: Invalid API key (admin API rejected it)");
    return false;
  }

  if (!res.ok) {
    console.error(`✗ Service role key: unexpected status ${res.status}`);
    return false;
  }

  console.log("✓ Service role key: admin API works");
  return true;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("\nSupabase env validation\n");

  if (!url) {
    console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  const expectedRef = projectRefFromUrl(url);
  console.log(`Project ref (from URL): ${expectedRef ?? "invalid URL"}`);

  const authKey = anon || publishable;
  if (!authKey) {
    console.error(
      "✗ Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
    process.exit(1);
  }

  if (!anon) {
    console.warn(
      "⚠ NEXT_PUBLIC_SUPABASE_ANON_KEY is empty — legacy anon JWT is more reliable than publishable keys in some SDK paths"
    );
  }

  let ok = await testAuthKey(url, authKey, anon ? "Anon key" : "Publishable key");

  if (publishable && anon && publishable !== anon) {
    ok = (await testAuthKey(url, publishable, "Publishable key")) && ok;
  }

  if (!service) {
    console.error("✗ Missing SUPABASE_SERVICE_ROLE_KEY (required for signup/admin)");
    ok = false;
  } else {
    const jwtRef = projectRefFromJwt(service);
    console.log(`Project ref (from service JWT): ${jwtRef ?? "unreadable"}`);

    if (expectedRef && jwtRef && jwtRef !== expectedRef) {
      console.error(
        `✗ Service role JWT project ref "${jwtRef}" does not match URL ref "${expectedRef}"`
      );
      console.error(
        "  → Copy a fresh service_role key from Supabase Dashboard → Settings → API → Legacy API Keys"
      );
      ok = false;
    } else {
      ok = (await testServiceRole(url, service)) && ok;
    }
  }

  console.log(ok ? "\nAll checks passed.\n" : "\nFix the issues above, then run npm run setup:supabase-env\n");
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
