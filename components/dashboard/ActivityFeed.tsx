"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  BookOpen,
  LogIn,
  RefreshCw,
  Settings,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { AuditAction } from "@/types";

interface ActivityItem {
  id: string;
  action: AuditAction;
  description: string;
  userEmail?: string | null;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const actionMeta: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  CREATE: { icon: UserPlus, color: BRAND.successColor, bg: "bg-emerald-50" },
  UPDATE: { icon: Settings, color: BRAND.primaryColor, bg: "bg-blue-50" },
  DELETE: { icon: AlertTriangle, color: BRAND.dangerColor, bg: "bg-red-50" },
  CHECKOUT: { icon: LogIn, color: BRAND.primaryColor, bg: "bg-blue-50" },
  CHECKIN: { icon: ArrowRightLeft, color: BRAND.successColor, bg: "bg-emerald-50" },
  RENEWAL: { icon: RefreshCw, color: BRAND.warningColor, bg: "bg-amber-50" },
  NOTIFICATION: { icon: Bell, color: BRAND.warningColor, bg: "bg-amber-50" },
};

const defaultMeta = {
  icon: BookOpen,
  color: BRAND.neutralColor,
  bg: "bg-slate-50",
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
        <p className="text-sm text-muted-foreground">Recent library activity</p>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {activities.map((item) => {
              const meta = actionMeta[item.action] ?? defaultMeta;
              const Icon = meta.icon;

              return (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40"
                >
                  <div
                    className={cn(
                      "relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      meta.bg
                    )}
                    style={{ color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                      style={{ backgroundColor: meta.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
