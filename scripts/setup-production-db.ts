#!/usr/bin/env tsx
/**
 * One-time production setup:
 * 1. Validates DATABASE_URL / DIRECT_URL in .env.local (real password, correct format)
 * 2. Pushes Prisma schema to Supabase
 * 3. Syncs DB env vars to Vercel Production + Preview
 *
 * Usage: npm run setup:production-db
 */
import { execSync } from "node:child_process";
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

function validateDatabaseUrl(name: string, url: string | undefined): string[] {
  const errors: string[] = [];
  if (!url?.trim()) {
    errors.push(`${name} is missing in .env.local`);
    return errors;
  }
  if (
    url.includes("[PASSWORD]") ||
    url.includes("[YOUR-PASSWORD]") ||
    url.includes("[password]") ||
    url.includes("YOUR-DB-PASSWORD")
  ) {
    errors.push(
      `${name} still contains a password placeholder — replace with your real Supabase database password`
    );
  }

  const creds = url.match(/^postgres(?:ql)?:\/\/([^@/]+)/);
  if (creds?.[1]?.includes("@")) {
    errors.push(
      `${name} password contains @ — encode it as %40 (e.g. Tagsclinic%402026)`
    );
  }
  if (name === "DATABASE_URL") {
    if (!url.includes("pgbouncer=true")) {
      errors.push(`${name} must include ?pgbouncer=true for Vercel/serverless`);
    }
    if (!url.includes(":6543/")) {
      errors.push(
        `${name} should use port 6543 (transaction pooler). Copy from Supabase → Connect → Prisma`
      );
    }
    if (!url.includes("pooler.supabase.com")) {
      errors.push(
        `${name} should use the pooler host (aws-0-*.pooler.supabase.com), not db.*.supabase.co:5432`
      );
    }
  }
  if (name === "DIRECT_URL" && !url.includes(":5432/")) {
    errors.push(`${name} should use port 5432 for direct/session connection`);
  }
  return errors;
}

function syncToVercel(key: string, value: string, env: "production" | "preview") {
  try {
    execSync(`npx vercel env rm ${key} ${env} --yes`, {
      stdio: "pipe",
      cwd: process.cwd(),
    });
  } catch {
    // Variable may not exist yet.
  }

  execSync(`npx vercel env add ${key} ${env}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    cwd: process.cwd(),
  });

  console.log(`✓ Synced ${key} → Vercel ${env}`);
}

async function main() {
  console.log("\nLibraryInventory — Production database setup\n");

  const env = loadEnvLocal();
  const databaseUrl = env.DATABASE_URL;
  const directUrl = env.DIRECT_URL;

  const errors = [
    ...validateDatabaseUrl("DATABASE_URL", databaseUrl),
    ...validateDatabaseUrl("DIRECT_URL", directUrl),
  ];

  if (errors.length > 0) {
    console.error("Fix these issues in .env.local first:\n");
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error(`
Get connection strings from:
  Supabase Dashboard → Project → Connect → ORMs → Prisma

Reset your database password if needed:
  Supabase → Project Settings → Database → Reset database password

Then update .env.local and run again:
  npm run setup:production-db
`);
    process.exit(1);
  }

  console.log("→ Pushing Prisma schema to Supabase...");
  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
  });
  console.log("✓ Database schema is up to date\n");

  console.log("→ Syncing DATABASE_URL and DIRECT_URL to Vercel...");
  for (const target of ["production", "preview"] as const) {
    syncToVercel("DATABASE_URL", databaseUrl!, target);
    syncToVercel("DIRECT_URL", directUrl!, target);
  }

  console.log(`
✓ Done!

Next steps:
  1. Redeploy:  npx vercel --prod
  2. Test signup at https://www.libraryinventory.com/signup
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
