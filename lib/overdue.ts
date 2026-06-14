import { LoanStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function markOverdueLoans(organizationId: string) {
  const now = new Date();

  const result = await prisma.loan.updateMany({
    where: {
      organizationId,
      deletedAt: null,
      status: LoanStatus.ACTIVE,
      dueDate: { lt: now },
    },
    data: { status: LoanStatus.OVERDUE },
  });

  return result.count;
}
