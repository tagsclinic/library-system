import { redirect } from "next/navigation";

import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { getUserDisplayName } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/platform");
  }

  if (!isSuperAdmin(user)) {
    redirect("/dashboard");
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { userId: user.id },
  });

  if (!platformUser) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PlatformSidebar
        userEmail={user.email}
        userName={getUserDisplayName(user)}
      />
      <div className="md:ml-[260px]">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
