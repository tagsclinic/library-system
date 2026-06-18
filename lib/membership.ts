import type { User } from "@supabase/supabase-js";
import { UserRole, type OrganizationMember } from "@prisma/client";

import { getUserDisplayName, getUserRole } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { syncAuthUserMetadata } from "@/lib/services/platform-users";

export type ResolvedMembership = {
  organizationId: string | null;
  role: UserRole;
  member: OrganizationMember | null;
};

/**
 * OrganizationMember (the same record shown on Settings > Team) is the
 * canonical membership record. Supabase user_metadata is a denormalized
 * copy read by auth checks and can drift out of sync (e.g. if metadata was
 * set before a role/org change was persisted). Resolve against the DB and
 * self-heal the metadata when it disagrees.
 *
 * This touches Prisma and the Supabase admin client, so it must stay out of
 * lib/organization.ts — that module is imported by the Edge middleware,
 * which can't bundle Node-only DB/admin code.
 */
export async function resolveMembership(user: User): Promise<ResolvedMembership> {
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
  });

  const organizationId = member?.organizationId ?? getOrganizationId(user);
  const role = member?.role ?? getUserRole(user);

  if (
    member &&
    (member.role !== getUserRole(user) ||
      member.organizationId !== getOrganizationId(user))
  ) {
    syncAuthUserMetadata({
      userId: user.id,
      email: user.email ?? member.email,
      fullName: getUserDisplayName(user),
      organizationId: member.organizationId,
      role: member.role,
    }).catch(() => {});
  }

  return { organizationId, role, member };
}
