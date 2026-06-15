import { PlatformRole, UserRole } from "@prisma/client";

import { PLATFORM_ROLE_METADATA_KEY } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncAuthUserMetadata(input: {
  userId: string;
  email: string;
  fullName?: string | null;
  organizationId?: string | null;
  role?: UserRole;
  isSuperAdmin?: boolean;
  password?: string;
}) {
  const admin = createAdminClient();

  const userMetadata: Record<string, string> = {};
  if (input.fullName) userMetadata.full_name = input.fullName;
  if (input.organizationId) userMetadata.organization_id = input.organizationId;
  if (input.role) userMetadata.role = input.role;

  const appMetadata: Record<string, string | null> = {};
  if (input.isSuperAdmin) {
    appMetadata[PLATFORM_ROLE_METADATA_KEY] = PlatformRole.SUPER_ADMIN;
  } else {
    appMetadata[PLATFORM_ROLE_METADATA_KEY] = null;
  }

  const { data, error } = await admin.auth.admin.updateUserById(input.userId, {
    email: input.email,
    ...(input.password ? { password: input.password } : {}),
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });

  if (error) throw new Error(error.message);
  return data.user;
}

export async function createPlatformAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
  organizationId?: string | null;
  role?: UserRole;
  isSuperAdmin?: boolean;
}) {
  const admin = createAdminClient();
  const normalizedEmail = input.email.toLowerCase().trim();

  const userMetadata: Record<string, string> = {
    full_name: input.fullName,
  };

  if (input.organizationId) {
    userMetadata.organization_id = input.organizationId;
  }
  if (input.role) {
    userMetadata.role = input.role;
  }

  const appMetadata: Record<string, string> = {};
  if (input.isSuperAdmin) {
    appMetadata[PLATFORM_ROLE_METADATA_KEY] = PlatformRole.SUPER_ADMIN;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });

  if (error) throw new Error(error.message);
  return data.user;
}

export async function deletePlatformAuthUser(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

export async function upsertOrganizationMember(input: {
  organizationId: string;
  userId: string;
  email: string;
  fullName?: string | null;
  role: UserRole;
}) {
  return prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    },
    update: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    },
  });
}

export async function upsertPlatformUserRecord(input: {
  userId: string;
  email: string;
}) {
  return prisma.platformUser.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      email: input.email,
      role: PlatformRole.SUPER_ADMIN,
    },
    update: { email: input.email },
  });
}

export async function removePlatformUserRecord(userId: string) {
  await prisma.platformUser.deleteMany({ where: { userId } });
}
