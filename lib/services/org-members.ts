import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPlatformAuthUser,
  deletePlatformAuthUser,
  syncAuthUserMetadata,
  upsertOrganizationMember,
} from "@/lib/services/platform-users";

export async function listOrganizationMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createOrganizationMember(input: {
  organizationId: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const admin = createAdminClient();
  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    throw new Error(listError.message);
  }

  const existingAuthUser = listData.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  );

  if (existingAuthUser) {
    const existingMember = await prisma.organizationMember.findFirst({
      where: { userId: existingAuthUser.id },
    });

    if (
      existingMember &&
      existingMember.organizationId !== input.organizationId
    ) {
      throw new Error("This email already belongs to another library");
    }

    await syncAuthUserMetadata({
      userId: existingAuthUser.id,
      email: normalizedEmail,
      fullName: input.fullName,
      organizationId: input.organizationId,
      role: input.role,
      password: input.password,
    });

    await upsertOrganizationMember({
      organizationId: input.organizationId,
      userId: existingAuthUser.id,
      email: normalizedEmail,
      fullName: input.fullName,
      role: input.role,
    });

    return {
      userId: existingAuthUser.id,
      email: normalizedEmail,
      fullName: input.fullName,
      role: input.role,
    };
  }

  const authUser = await createPlatformAuthUser({
    email: normalizedEmail,
    password: input.password,
    fullName: input.fullName,
    organizationId: input.organizationId,
    role: input.role,
  });

  await upsertOrganizationMember({
    organizationId: input.organizationId,
    userId: authUser.id,
    email: normalizedEmail,
    fullName: input.fullName,
    role: input.role,
  });

  return {
    userId: authUser.id,
    email: normalizedEmail,
    fullName: input.fullName,
    role: input.role,
  };
}

export async function updateOrganizationMember(input: {
  organizationId: string;
  userId: string;
  fullName?: string;
  role?: UserRole;
  password?: string;
}) {
  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: input.organizationId, userId: input.userId },
  });

  if (!member) {
    throw new Error("Team member not found");
  }

  if (input.role && member.role === UserRole.ADMIN && input.role !== UserRole.ADMIN) {
    const adminCount = await prisma.organizationMember.count({
      where: { organizationId: input.organizationId, role: UserRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new Error("Each library must have at least one admin");
    }
  }

  await syncAuthUserMetadata({
    userId: input.userId,
    email: member.email,
    fullName: input.fullName ?? member.fullName,
    organizationId: input.organizationId,
    role: input.role ?? member.role,
    password: input.password,
  });

  return prisma.organizationMember.update({
    where: { id: member.id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
    },
  });
}

export async function deleteOrganizationMember(input: {
  organizationId: string;
  userId: string;
  actorUserId: string;
}) {
  if (input.userId === input.actorUserId) {
    throw new Error("You cannot remove your own account from this page");
  }

  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: input.organizationId, userId: input.userId },
  });

  if (!member) {
    throw new Error("Team member not found");
  }

  if (member.role === UserRole.ADMIN) {
    const adminCount = await prisma.organizationMember.count({
      where: { organizationId: input.organizationId, role: UserRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new Error("Cannot remove the last admin for this library");
    }
  }

  await deletePlatformAuthUser(input.userId);
  await prisma.organizationMember.delete({ where: { id: member.id } });
}
