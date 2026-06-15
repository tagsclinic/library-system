"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard },
  { href: "/platform/organizations", label: "Organizations", icon: Building2 },
  { href: "/platform/users", label: "Users", icon: Users },
] as const;

interface PlatformSidebarProps {
  userEmail?: string | null;
  userName?: string;
}

export function PlatformSidebar({ userEmail, userName }: PlatformSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = (userName ?? userEmail ?? "SA")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r bg-slate-950 md:flex"
    >
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Platform Admin</p>
            <p className="text-[11px] text-slate-400">{BRAND.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/platform" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-violet-600 text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {userName ?? "Super Admin"}
            </p>
            <p className="truncate text-xs text-slate-400">{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white"
          onClick={() => void handleLogout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
