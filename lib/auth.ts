import type { User } from "@supabase/supabase-js";

import { UserRole } from "@prisma/client";

import { isSuperAdmin } from "@/lib/platform";

export { isSuperAdmin } from "@/lib/platform";

export function getUserRole(user: User): UserRole {
  const role =
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined);

  if (role === UserRole.ADMIN) return UserRole.ADMIN;
  if (role === UserRole.LIBRARIAN) return UserRole.LIBRARIAN;
  if (role === UserRole.VIEWER) return UserRole.VIEWER;

  return UserRole.VIEWER;
}

export function getUserDisplayName(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Unknown User"
  );
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isLibrarian(role: UserRole): boolean {
  return role === UserRole.LIBRARIAN;
}

export function isViewer(role: UserRole): boolean {
  return role === UserRole.VIEWER;
}

export function canManageBooks(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.LIBRARIAN;
}

export function canManageBorrowers(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.LIBRARIAN;
}

export function canCheckout(role: UserRole): boolean {
  return canManageBooks(role);
}

export function canCheckIn(role: UserRole): boolean {
  return canManageBooks(role);
}

export function canProcessRenewals(role: UserRole): boolean {
  return canManageBorrowers(role);
}

export function canSendNotifications(role: UserRole): boolean {
  return canManageBorrowers(role);
}

export function canViewReports(role: UserRole): boolean {
  return true;
}

export function canViewAudit(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.LIBRARIAN;
}

export function canManageSettings(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function canManagePlatform(user: User): boolean {
  return isSuperAdmin(user);
}

export function canViewDashboard(role: UserRole): boolean {
  return true;
}

export function hasMinimumRole(
  role: UserRole,
  required: UserRole
): boolean {
  const hierarchy: Record<UserRole, number> = {
    [UserRole.VIEWER]: 1,
    [UserRole.LIBRARIAN]: 2,
    [UserRole.ADMIN]: 3,
  };

  return hierarchy[role] >= hierarchy[required];
}
