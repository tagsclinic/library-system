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

interface DashboardApiResponse {
  stats: Partial<DashboardStats> & {
    totalBooks: number;
    availableBooks: number;
    checkedOutBooks: number;
    totalBorrowers: number;
    activeLoans: number;
    overdueLoans: number;
    dueSoonLoans: number;
    lostBooks: number;
  };
  overdueList: Array<{
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
    loansByMonth: Array<{
      month: string;
      checkouts?: number;
      returns?: number;
      count?: number;
    }>;
    booksByCategory: Array<{ category: string; count: number }>;
  };
}

interface DashboardData {
  stats: DashboardStats;
  overdue: DashboardApiResponse["overdueList"];
  recentActivity: DashboardApiResponse["recentActivity"];
  recentCheckouts: DashboardApiResponse["recentCheckouts"];
  chartData: {
    loansByMonth: Array<{ month: string; checkouts: number; returns: number }>;
    booksByCategory: Array<{ category: string; count: number }>;
  };
}

function normalizeDashboardData(raw: DashboardApiResponse): DashboardData {
  return {
    stats: {
      totalBooks: raw.stats.totalBooks ?? 0,
      availableBooks: raw.stats.availableBooks ?? 0,
      checkedOutBooks: raw.stats.checkedOutBooks ?? 0,
      totalBorrowers: raw.stats.totalBorrowers ?? 0,
      activeBorrowers: raw.stats.activeBorrowers ?? raw.stats.totalBorrowers ?? 0,
      activeLoans: raw.stats.activeLoans ?? 0,
      overdueLoans: raw.stats.overdueLoans ?? 0,
      dueSoonLoans: raw.stats.dueSoonLoans ?? 0,
      lostBooks: raw.stats.lostBooks ?? 0,
    },
    overdue: raw.overdueList ?? [],
    recentActivity: raw.recentActivity ?? [],
    recentCheckouts: raw.recentCheckouts ?? [],
    chartData: {
      booksByCategory: raw.chartData?.booksByCategory ?? [],
      loansByMonth: (raw.chartData?.loansByMonth ?? []).map((row) => ({
        month: row.month,
        checkouts: row.checkouts ?? row.count ?? 0,
        returns: row.returns ?? 0,
      })),
    },
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
  const raw = (json.data ?? json) as DashboardApiResponse;
  return normalizeDashboardData(raw);
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
