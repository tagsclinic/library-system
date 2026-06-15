import type { User } from "@supabase/supabase-js";
import { BorrowerStatus } from "@prisma/client";

export const BORROWER_ACCOUNT_TYPE = "borrower";

export function isBorrowerAccount(user: User): boolean {
  return user.user_metadata?.account_type === BORROWER_ACCOUNT_TYPE;
}

export function getBorrowerIdFromUser(user: User): string | null {
  return (user.user_metadata?.borrower_id as string | undefined) ?? null;
}

export function getBorrowerOrganizationId(user: User): string | null {
  return (user.user_metadata?.organization_id as string | undefined) ?? null;
}

export async function getBorrowerForUser(user: User) {
  const { prisma } = await import("@/lib/prisma");
  const borrowerId = getBorrowerIdFromUser(user);
  if (!borrowerId) return null;

  return prisma.borrower.findFirst({
    where: { id: borrowerId, deletedAt: null },
  });
}

export function isBorrowerApproved(status: BorrowerStatus): boolean {
  return status === BorrowerStatus.ACTIVE;
}
