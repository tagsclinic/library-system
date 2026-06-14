import { LoanStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export enum RiskLevel {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export interface RiskInput {
  overdueCount: number;
  lostCount: number;
  damagedCount: number;
  renewalCount: number;
}

export function calculateRiskScore(input: RiskInput): number {
  return (
    input.overdueCount * 3 +
    input.lostCount * 5 +
    input.damagedCount * 2 +
    input.renewalCount
  );
}

export function getRiskLevel(score: number): RiskLevel {
  if (score === 0) return RiskLevel.NONE;
  if (score <= 3) return RiskLevel.LOW;
  if (score <= 8) return RiskLevel.MEDIUM;
  return RiskLevel.HIGH;
}

export function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case RiskLevel.NONE:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case RiskLevel.LOW:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case RiskLevel.MEDIUM:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case RiskLevel.HIGH:
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export async function getBorrowerRiskProfile(
  organizationId: string,
  borrowerId: string
) {
  const loanWhere = { organizationId, borrowerId, deletedAt: null };

  const [overdueCount, lostCount, damagedCount, renewalCount] =
    await Promise.all([
      prisma.loan.count({
        where: {
          ...loanWhere,
          OR: [
            { status: LoanStatus.OVERDUE },
            { status: LoanStatus.ACTIVE, dueDate: { lt: new Date() } },
          ],
        },
      }),
      prisma.loan.count({
        where: { ...loanWhere, status: LoanStatus.LOST },
      }),
      prisma.loan.count({
        where: { ...loanWhere, status: LoanStatus.DAMAGED },
      }),
      prisma.renewal.count({
        where: {
          organizationId,
          loan: { borrowerId, deletedAt: null },
        },
      }),
    ]);

  const riskScore = calculateRiskScore({
    overdueCount,
    lostCount,
    damagedCount,
    renewalCount,
  });

  return {
    borrowerId,
    overdueCount,
    lostCount,
    damagedCount,
    renewalCount,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
  };
}
