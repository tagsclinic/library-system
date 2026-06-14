import { type ClassValue, clsx } from "clsx";
import { addDays, addMonths, addWeeks, format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { LoanPeriodType } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | string | null | undefined,
  pattern = "MMM d, yyyy"
): string {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return format(value, pattern);
}

export function formatDateTime(
  date: Date | string | null | undefined,
  pattern = "MMM d, yyyy h:mm a"
): string {
  return formatDate(date, pattern);
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "USD"
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numeric);
}

export function calculateDueDate(
  startDate: Date,
  periodType: LoanPeriodType,
  customDays?: number | null
): Date {
  switch (periodType) {
    case LoanPeriodType.ONE_WEEK:
      return addWeeks(startDate, 1);
    case LoanPeriodType.TWO_WEEKS:
      return addWeeks(startDate, 2);
    case LoanPeriodType.ONE_MONTH:
      return addMonths(startDate, 1);
    case LoanPeriodType.TWO_MONTHS:
      return addMonths(startDate, 2);
    case LoanPeriodType.CUSTOM:
      return addDays(startDate, customDays && customDays > 0 ? customDays : 14);
    default:
      return addWeeks(startDate, 2);
  }
}

export function calculateBorrowerRiskScore(stats: {
  overdueCount: number;
  lostCount: number;
  damagedCount: number;
}): number {
  return (
    stats.overdueCount * 3 + stats.lostCount * 5 + stats.damagedCount * 2
  );
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
