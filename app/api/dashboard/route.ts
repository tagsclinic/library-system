import { BookStatus, LoanStatus } from "@prisma/client";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";

import {
  getAppSetting,
  isErrorResponse,
  notDeleted,
  requireAuth,
  serialize,
} from "@/lib/api-helpers";
import { canViewDashboard } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canViewDashboard(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { organizationId } = auth;
  const orgFilter = { organizationId, ...notDeleted() };
  const now = new Date();
  const dueSoonDaysSetting = await getAppSetting(organizationId, "dueSoonDays");
  const dueSoonDays = dueSoonDaysSetting ? parseInt(dueSoonDaysSetting, 10) : 3;
  const dueSoonCutoff = addDays(now, dueSoonDays);

  const overdueWhere = {
    ...orgFilter,
    OR: [
      { status: LoanStatus.OVERDUE },
      { status: LoanStatus.ACTIVE, dueDate: { lt: now } },
    ],
  };

  const loanInclude = {
    book: { select: { id: true, title: true, author: true } },
    borrower: { select: { id: true, fullName: true, phone: true } },
  };

  const [
    totalBooks,
    availableBooks,
    checkedOutBooks,
    lostBooks,
    totalBorrowers,
    activeLoans,
    overdueLoans,
    dueSoonLoans,
    dueSoonList,
    recentCheckouts,
    overdueList,
    recentActivity,
    booksByCategory,
    loansByMonth,
  ] = await Promise.all([
    prisma.book.count({ where: orgFilter }),
    prisma.book.count({
      where: { ...orgFilter, status: BookStatus.AVAILABLE },
    }),
    prisma.book.count({
      where: { ...orgFilter, status: BookStatus.CHECKED_OUT },
    }),
    prisma.book.count({ where: { ...orgFilter, status: BookStatus.LOST } }),
    prisma.borrower.count({ where: orgFilter }),
    prisma.loan.count({
      where: { ...orgFilter, status: LoanStatus.ACTIVE },
    }),
    prisma.loan.count({ where: overdueWhere }),
    prisma.loan.count({
      where: {
        ...orgFilter,
        status: LoanStatus.ACTIVE,
        dueDate: { gte: now, lte: dueSoonCutoff },
      },
    }),
    prisma.loan.findMany({
      where: {
        ...orgFilter,
        status: LoanStatus.ACTIVE,
        dueDate: { gte: now, lte: dueSoonCutoff },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: loanInclude,
    }),
    prisma.loan.findMany({
      where: orgFilter,
      orderBy: { checkoutDate: "desc" },
      take: 10,
      include: loanInclude,
    }),
    prisma.loan.findMany({
      where: overdueWhere,
      orderBy: { dueDate: "asc" },
      take: 10,
      include: loanInclude,
    }),
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        description: true,
        userEmail: true,
        createdAt: true,
      },
    }),
    prisma.book.groupBy({
      by: ["category"],
      where: orgFilter,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT TO_CHAR("checkoutDate", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
      FROM "Loan"
      WHERE "checkoutDate" >= NOW() - INTERVAL '6 months'
        AND "organizationId" = ${organizationId}
        AND "deletedAt" IS NULL
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  const stats = {
    totalBooks,
    availableBooks,
    checkedOutBooks,
    totalBorrowers,
    activeLoans,
    overdueLoans,
    dueSoonLoans,
    lostBooks,
  };

  const chartData = {
    booksByCategory: booksByCategory.map((row) => ({
      category: row.category ?? "Uncategorized",
      count: row._count.id,
    })),
    loansByMonth: loansByMonth.map((row) => ({
      month: row.month,
      count: Number(row.count),
    })),
  };

  return NextResponse.json(
    serialize({
      data: {
        stats,
        chartData,
        recentCheckouts,
        overdueList,
        dueSoon: dueSoonList,
        recentActivity,
      },
    })
  );
}
