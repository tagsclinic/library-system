"use client";

import { useEffect, useState } from "react";
import { Building2, BookOpen, Shield, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformStats {
  organizationCount: number;
  activeOrganizationCount: number;
  userCount: number;
  superAdminCount: number;
  bookCount: number;
  activeLoanCount: number;
}

const STAT_CARDS = [
  { key: "activeOrganizationCount" as const, label: "Active Libraries", icon: Building2 },
  { key: "userCount" as const, label: "Platform Users", icon: Users },
  { key: "superAdminCount" as const, label: "Super Admins", icon: Shield },
  { key: "bookCount" as const, label: "Total Books", icon: BookOpen },
];

export default function PlatformOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/platform/stats");
        const json = await res.json();
        if (res.ok) setStats(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Manage all libraries, users, and subscriptions across LibraryInventory"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {(stats?.[key] ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Add or remove users from any library</p>
          <p>• Suspend organizations or change subscription plans</p>
          <p>• Promote users to super admin for full platform access</p>
          <p>• Active loans across all libraries: {stats?.activeLoanCount ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}
