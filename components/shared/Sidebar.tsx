"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRightLeft,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  Library,
  LogIn,
  RefreshCw,
  ScanLine,
  Settings,
  Shield,
  Bookmark,
  Users,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { canManageSettings, canViewAudit } from "@/lib/auth";
import { UserRole } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
  badge?: number;
}

interface SidebarProps {
  role: UserRole;
  libraryName?: string;
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  showPlatformLink?: boolean;
}

export function Sidebar({
  role,
  libraryName = "Greenwood Library",
  userName,
  userEmail,
  notificationCount = 0,
  showPlatformLink = false,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/books", label: "Books", icon: BookOpen },
    { href: "/borrowers", label: "Borrowers", icon: Users },
    { href: "/checkout", label: "Check Outs", icon: LogIn },
    { href: "/checkin", label: "Check Ins", icon: ArrowRightLeft },
    { href: "/renewals", label: "Renewals", icon: RefreshCw },
    { href: "/reservations", label: "Reservations", icon: Bookmark },
    { href: "/catalog", label: "Catalog", icon: ScanLine },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    {
      href: "/notifications",
      label: "Notifications",
      icon: Bell,
      badge: notificationCount > 0 ? notificationCount : undefined,
    },
    {
      href: "/audit",
      label: "Audit Logs",
      icon: Shield,
      show: canViewAudit(role),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      show: canManageSettings(role),
    },
    {
      href: "/platform",
      label: "Platform Admin",
      icon: Shield,
      show: showPlatformLink,
    },
  ];

  const initials = (userName ?? userEmail ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col md:flex"
      style={{ backgroundColor: BRAND.sidebarBg }}
    >
      <div className="border-b border-white/10 px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB]">
            <Library className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{BRAND.name}</p>
            <p className="text-[11px] leading-tight text-slate-400">
              {BRAND.tagline}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems
          .filter((item) => item.show !== false)
          .map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[10px] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarFallback className="bg-[#2563EB] text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {libraryName}
            </p>
            <p className="truncate text-xs text-slate-400">
              {userName ?? userEmail ?? "Staff"}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </div>
      </div>
    </aside>
  );
}
