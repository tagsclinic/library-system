import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { DueSoonList } from "@/components/dashboard/DueSoonList";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentCheckouts } from "@/components/dashboard/RecentCheckouts";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { PageHeader } from "@/components/shared/PageHeader";
import type { AuditAction, DashboardStats, LoanStatus } from "@/types";
import { headers } from "next/headers";

interface DashboardData {
  stats: DashboardStats;
  overdue: Array<{
    id: string;
    dueDate: string;
    status: LoanStatus;
    book: { id: string; title: string; author: string };
    borrower: { id: string; fullName: string };
  }>;
  recentActivity: Array<{
    id: string;
    action: AuditAction;
    description: string;
    userEmail?: string | null;
    createdAt: string;
  }>;
  recentCheckouts: Array<{
    id: string;
    checkoutDate: string;
    dueDate: string;
    book: { id: string; title: string };
    borrower: { id: string; fullName: string };
  }>;
  chartData: {
    loansByMonth: Array<{ month: string; checkouts: number; returns: number }>;
    booksByCategory: Array<{ category: string; count: number }>;
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const cookie = headersList.get("cookie") ?? "";

  const res = await fetch(`${protocol}://${host}/api/dashboard`, {
    cache: "no-store",
    headers: { cookie },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body.error ??
      (res.status === 401
        ? "Your session expired. Please sign in again."
        : res.status === 403
          ? "Your account is not linked to an organization. Contact support."
          : "Failed to load dashboard data");
    throw new Error(message);
  }

  const json = await res.json();
  return json.data ?? json;
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of library operations and activity"
      />
      <StatsCards stats={data.stats} />
      <QuickActions />
      <div className="grid gap-6 lg:grid-cols-3">
        <MonthlyChart data={data.chartData.loansByMonth} />
        <CategoryChart data={data.chartData.booksByCategory} />
      </div>
      <RecentCheckouts checkouts={data.recentCheckouts} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DueSoonList loans={data.overdue} />
        <ActivityFeed activities={data.recentActivity} />
      </div>
    </div>
  );
}
