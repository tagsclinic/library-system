export {
  BookStatus,
  BookCondition,
  BorrowerStatus,
  LoanPeriodType,
  LoanStatus,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  PaymentStatus,
  UserRole,
  AuditAction,
} from "@prisma/client";

export { RiskLevel } from "@/lib/risk";

export type {
  Book,
  Borrower,
  Loan,
  Renewal,
  ConditionHistory,
  NotificationLog,
  NotificationTemplate,
  AuditLog,
  AppSettings,
} from "@prisma/client";

export interface ApiError {
  error: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  checkedOutBooks: number;
  totalBorrowers: number;
  activeBorrowers: number;
  activeLoans: number;
  overdueLoans: number;
  dueSoonLoans: number;
  lostBooks: number;
}

export interface ActiveBorrower {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  activeLoans: number;
  status: string;
}

export interface OverdueListItem {
  id: string;
  dueDate: string;
  status: import("@prisma/client").LoanStatus;
  book: { id: string; title: string; author: string };
  borrower: { id: string; fullName: string; phone?: string };
}

export interface BorrowerRiskProfile {
  borrowerId: string;
  overdueCount: number;
  lostCount: number;
  damagedCount: number;
  renewalCount?: number;
  riskScore: number;
  riskLevel?: import("@/lib/risk").RiskLevel;
}

export type UserMetadata = {
  role?: string;
  full_name?: string;
  organization_id?: string;
};
