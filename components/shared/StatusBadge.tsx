import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BookStatus,
  BorrowerStatus,
  LoanStatus,
} from "@/types";

type StatusType = BookStatus | BorrowerStatus | LoanStatus;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

const bookStatusStyles: Record<BookStatus, string> = {
  [BookStatus.AVAILABLE]:
    "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  [BookStatus.CHECKED_OUT]:
    "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  [BookStatus.LOST]:
    "border-transparent bg-red-100 text-red-800 hover:bg-red-100",
  [BookStatus.DAMAGED]:
    "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100",
  [BookStatus.ARCHIVED]:
    "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-100",
};

const borrowerStatusStyles: Record<BorrowerStatus, string> = {
  [BorrowerStatus.ACTIVE]:
    "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  [BorrowerStatus.WATCHLIST]:
    "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100",
  [BorrowerStatus.BLOCKED]:
    "border-transparent bg-red-100 text-red-800 hover:bg-red-100",
};

const loanStatusStyles: Record<LoanStatus, string> = {
  [LoanStatus.ACTIVE]:
    "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  [LoanStatus.RETURNED]:
    "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  [LoanStatus.OVERDUE]:
    "border-transparent bg-red-100 text-red-800 hover:bg-red-100",
  [LoanStatus.LOST]:
    "border-transparent bg-red-100 text-red-800 hover:bg-red-100",
  [LoanStatus.DAMAGED]:
    "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100",
};

function getStatusStyles(status: StatusType): string {
  if (status in bookStatusStyles) {
    return bookStatusStyles[status as BookStatus];
  }
  if (status in borrowerStatusStyles) {
    return borrowerStatusStyles[status as BorrowerStatus];
  }
  return loanStatusStyles[status as LoanStatus];
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(getStatusStyles(status), className)}>
      {formatStatusLabel(status)}
    </Badge>
  );
}
