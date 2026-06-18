import { redirect } from "next/navigation";
import { NotificationStatus } from "@prisma/client";

import { createClient } from "@/lib/supabase/server";
import { getUserDisplayName, isSuperAdmin } from "@/lib/auth";
import { resolveMembership } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { organizationId, role } = await resolveMembership(user);
  const organization = organizationId
    ? await prisma.organization.findFirst({
        where: { id: organizationId, deletedAt: null },
      })
    : null;

  if (!organization) {
    if (isSuperAdmin(user)) {
      redirect("/platform");
    }
    redirect("/login");
  }

  const notificationCount = await prisma.notificationLog.count({
    where: {
      organizationId: organization.id,
      status: NotificationStatus.PENDING,
    },
  });

  return (
    <div className="min-h-screen">
      <Sidebar
        role={role}
        libraryName={organization.name}
        userName={getUserDisplayName(user)}
        userEmail={user.email}
        notificationCount={notificationCount}
        showPlatformLink={isSuperAdmin(user)}
      />
      <div className="ml-0 flex min-h-screen flex-col md:ml-[280px]">
        <Topbar
          userEmail={user.email}
          userName={getUserDisplayName(user)}
          notificationCount={notificationCount}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
