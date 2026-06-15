/**
 * Create or update a platform super admin account.
 *
 * Usage:
 *   npm run auth:super-admin -- you@example.com YourPassword123!
 *   npm run auth:super-admin -- you@example.com YourPassword123! "Your Name"
 */
import { UserRole } from "@prisma/client";

import { prisma } from "../lib/prisma";
import {
  createPlatformAuthUser,
  syncAuthUserMetadata,
  upsertPlatformUserRecord,
} from "../lib/services/platform-users";
import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const password = process.argv[3];
  const fullName = process.argv[4] ?? "Platform Super Admin";

  if (!email || !password) {
    console.error(
      "Usage: npm run auth:super-admin -- <email> <password> [full name]"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const admin = createAdminClient();
  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const existing = listData.users.find(
    (user) => user.email?.toLowerCase() === email
  );

  let userId: string;

  if (existing) {
    await syncAuthUserMetadata({
      userId: existing.id,
      email,
      fullName,
      organizationId: existing.user_metadata?.organization_id as string | undefined,
      role: (existing.user_metadata?.role as UserRole | undefined) ?? UserRole.ADMIN,
      isSuperAdmin: true,
      password,
    });
    userId = existing.id;
    console.log(`✓ Updated existing user as super admin: ${email}`);
  } else {
    const authUser = await createPlatformAuthUser({
      email,
      password,
      fullName,
      isSuperAdmin: true,
    });
    userId = authUser.id;
    console.log(`✓ Created super admin: ${email}`);
  }

  await upsertPlatformUserRecord({ userId, email });

  console.log("\nSuper admin ready.");
  console.log(`  Email:    ${email}`);
  console.log(`  Login at: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`);
  console.log(`  Console:  /platform`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
