"use client";

import {
  AlertTriangle,
  BookOpen,
  BookMarked,
  Library,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

type StatKey =
  | "totalBooks"
  | "availableBooks"
  | "checkedOutBooks"
  | "overdueLoans"
  | "lostBooks"
  | "activeBorrowers";

const cards: Array<{
  key: StatKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend: number;
}> = [
  {
    key: "totalBooks",
    label: "Total Books",
    icon: Library,
    iconBg: "bg-blue-50",
    iconColor: "text-[#2563EB]",
    trend: 4.2,
  },
  {
    key: "availableBooks",
    label: "Available Books",
    icon: BookOpen,
    iconBg: "bg-emerald-50",
    iconColor: "text-[#10B981]",
    trend: 2.8,
  },
  {
    key: "checkedOutBooks",
    label: "Checked Out",
    icon: BookMarked,
    iconBg: "bg-blue-50",
    iconColor: "text-[#2563EB]",
    trend: -1.5,
  },
  {
    key: "overdueLoans",
    label: "Overdue Books",
    icon: AlertTriangle,
    iconBg: "bg-amber-50",
    iconColor: "text-[#F59E0B]",
    trend: -3.1,
  },
  {
    key: "lostBooks",
    label: "Lost Books",
    icon: XCircle,
    iconBg: "bg-red-50",
    iconColor: "text-[#EF4444]",
    trend: 0.4,
  },
  {
    key: "activeBorrowers",
    label: "Active Borrowers",
    icon: Users,
    iconBg: "bg-emerald-50",
    iconColor: "text-[#10B981]",
    trend: 5.6,
  },
];

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        isPositive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      )}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map(({ key, label, icon: Icon, iconBg, iconColor, trend }) => (
        <Card
          key={key}
          className="border-border/60 shadow-sm transition-shadow hover:shadow-md"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  iconBg
                )}
              >
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>
              <TrendBadge value={trend} />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <p
                className="text-3xl font-bold tracking-tight"
                style={{ color: BRAND.primaryColor }}
              >
                {(stats[key] ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
