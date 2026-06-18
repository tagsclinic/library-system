import type { User } from "@supabase/supabase-js";

export function getOrganizationId(user: User): string | null {
  return (user.user_metadata?.organization_id as string | undefined) ?? null;
}

export function orgScope(organizationId: string) {
  return { organizationId, deletedAt: null };
}

export function softDeleteData() {
  return { deletedAt: new Date() };
}
