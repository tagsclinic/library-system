import type { User } from "@supabase/supabase-js";
import { PlatformRole } from "@prisma/client";

export const PLATFORM_ROLE_METADATA_KEY = "platform_role";

export function getPlatformRole(user: User): PlatformRole | null {
  const role = user.app_metadata?.[PLATFORM_ROLE_METADATA_KEY] as
    | string
    | undefined;

  if (role === PlatformRole.SUPER_ADMIN) {
    return PlatformRole.SUPER_ADMIN;
  }

  return null;
}

export function isSuperAdmin(user: User): boolean {
  return getPlatformRole(user) === PlatformRole.SUPER_ADMIN;
}
