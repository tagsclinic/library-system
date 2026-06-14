export function getDatabaseConfigError(): string | null {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const directUrl = process.env.DIRECT_URL?.trim() ?? "";

  if (!databaseUrl || !directUrl) {
    return "Database is not configured. Set DATABASE_URL and DIRECT_URL in Vercel environment variables.";
  }

  const placeholders = [
    "[PASSWORD]",
    "[YOUR-PASSWORD]",
    "[password]",
    "YOUR-DB-PASSWORD",
  ];
  for (const token of placeholders) {
    if (databaseUrl.includes(token) || directUrl.includes(token)) {
      return "Database password is still a placeholder. Set your real Supabase password in Vercel → Settings → Environment Variables, then redeploy.";
    }
  }

  // Unencoded @ in password breaks postgres://user:pass@host parsing
  const credsMatch = databaseUrl.match(/^postgres(?:ql)?:\/\/([^@]+)@/);
  if (credsMatch && credsMatch[1].includes("@")) {
    return "Database password contains @ — URL-encode it as %40 in DATABASE_URL and DIRECT_URL.";
  }

  if (!databaseUrl.includes("pgbouncer=true")) {
    return "DATABASE_URL must use the Supabase transaction pooler (port 6543) with ?pgbouncer=true.";
  }

  return null;
}
