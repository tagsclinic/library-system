#!/usr/bin/env tsx
/**
 * Sync Supabase public env vars from .env.local to Vercel.
 * Usage: npm run setup:supabase-env
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

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

function syncToVercel(key: string, value: string, env: "production" | "preview") {
  if (!value) return;
  try {
    execSync(`npx vercel env rm ${key} ${env} --yes`, {
      stdio: "pipe",
      cwd: process.cwd(),
    });
  } catch {
    // ok if missing
  }
  execSync(`npx vercel env add ${key} ${env}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    cwd: process.cwd(),
  });
  console.log(`✓ ${key} → Vercel ${env}`);
}

function main() {
  const env = loadEnvLocal();
  console.log("\nSyncing Supabase env to Vercel...\n");

  for (const key of KEYS) {
    const value = env[key];
    if (!value) {
      console.log(`⊘ Skipping ${key} (not set locally)`);
      continue;
    }
    syncToVercel(key, value, "production");
  }

  console.log("\nDone. Redeploy: npx vercel --prod\n");
}

main();
