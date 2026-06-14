import type { User } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";

export function getOrganizationId(user: User): string | null {
  return (user.user_metadata?.organization_id as string | undefined) ?? null;
}

export async function getOrganizationForUser(user: User) {
  const orgId = getOrganizationId(user);
  if (!orgId) return null;

  return prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
  });
}

export async function requireOrganization(user: User) {
  const org = await getOrganizationForUser(user);
  if (!org) {
    throw new Error("Organization not found for user");
  }
  return org;
}

export function orgScope(organizationId: string) {
  return { organizationId, deletedAt: null };
}

export function softDeleteData() {
  return { deletedAt: new Date() };
}
