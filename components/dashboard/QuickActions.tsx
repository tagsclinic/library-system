"use client";

import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  LogIn,
  Plus,
  ScanLine,
  UserPlus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "Add New Book",
    href: "/books/new",
    icon: Plus,
    bg: "bg-blue-50 hover:bg-blue-100",
    iconColor: "text-[#2563EB]",
    border: "border-blue-100",
  },
  {
    label: "Add Borrower",
    href: "/borrowers/new",
    icon: UserPlus,
    bg: "bg-emerald-50 hover:bg-emerald-100",
    iconColor: "text-[#10B981]",
    border: "border-emerald-100",
  },
  {
    label: "Check Out Book",
    href: "/checkout",
    icon: LogIn,
    bg: "bg-violet-50 hover:bg-violet-100",
    iconColor: "text-violet-600",
    border: "border-violet-100",
  },
  {
    label: "Check In Book",
    href: "/checkin",
    icon: ArrowRightLeft,
    bg: "bg-amber-50 hover:bg-amber-100",
    iconColor: "text-[#F59E0B]",
    border: "border-amber-100",
  },
  {
    label: "Scan Barcode",
    href: "/catalog",
    icon: ScanLine,
    bg: "bg-cyan-50 hover:bg-cyan-100",
    iconColor: "text-cyan-600",
    border: "border-cyan-100",
  },
  {
    label: "View Reports",
    href: "/reports",
    icon: BarChart3,
    bg: "bg-slate-50 hover:bg-slate-100",
    iconColor: "text-slate-600",
    border: "border-slate-200",
  },
];

export function QuickActions() {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Common tasks at your fingertips
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map(({ label, href, icon: Icon, bg, iconColor, border }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-all hover:shadow-sm",
                bg,
                border
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-sm transition-transform group-hover:scale-105",
                  iconColor
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
