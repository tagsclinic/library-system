/**
 * Creates Supabase Auth users for local/demo login.
 *
 * Requires in .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role)
 *   DATABASE_URL               (to look up organization id)
 *
 * Run: npm run auth:seed
 */
import { UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/prisma";

const DEMO_USERS = [
  {
    email: "admin@library.com",
    password: "admin123",
    role: UserRole.ADMIN,
    fullName: "Library Admin",
  },
  {
    email: "librarian@library.com",
    password: "lib123",
    role: UserRole.LIBRARIAN,
    fullName: "Head Librarian",
  },
  {
    email: "viewer@library.com",
    password: "view123",
    role: UserRole.VIEWER,
    fullName: "Viewer",
  },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    console.error(
      "Get the service role key from Supabase → Project Settings → API → service_role (secret)"
    );
    process.exit(1);
  }

  const org = await prisma.organization.findFirst({
    where: { slug: "greenwood-library", deletedAt: null },
  });

  if (!org) {
    console.error(
      "Organization not found. Run `npm run db:seed` first to create Greenwood Library."
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers();

  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  console.log(`Using organization: ${org.name} (${org.id})\n`);

  for (const user of DEMO_USERS) {
    const metadata = {
      role: user.role,
      full_name: user.fullName,
      organization_id: org.id,
    };

    const existing = listData.users.find(
      (u) => u.email?.toLowerCase() === user.email.toLowerCase()
    );

    let userId: string;

    if (existing) {
      const { data, error } = await admin.auth.admin.updateUserById(
        existing.id,
        {
          password: user.password,
          email_confirm: true,
          user_metadata: metadata,
        }
      );

      if (error) {
        console.error(`✗ ${user.email}: ${error.message}`);
        continue;
      }

      userId = data.user.id;
      console.log(`✓ Updated ${user.email} (${user.role})`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (error) {
        console.error(`✗ ${user.email}: ${error.message}`);
        continue;
      }

      userId = data.user.id;
      console.log(`✓ Created ${user.email} (${user.role})`);
    }

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId,
        },
      },
      create: {
        organizationId: org.id,
        userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      update: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  }

  console.log("\nDemo logins:");
  for (const user of DEMO_USERS) {
    console.log(`  ${user.email} / ${user.password} (${user.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
