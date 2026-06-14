import { type AuditAction, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface LogAuditParams {
  organizationId: string;
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  previousData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  bookId?: string | null;
  borrowerId?: string | null;
  loanId?: string | null;
}

export async function logAudit(params: LogAuditParams) {
  return prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      description: params.description,
      previousData: params.previousData ?? undefined,
      newData: params.newData ?? undefined,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      bookId: params.bookId ?? null,
      borrowerId: params.borrowerId ?? null,
      loanId: params.loanId ?? null,
    },
  });
}

export async function logAuditBatch(entries: LogAuditParams[]) {
  return prisma.$transaction(
    entries.map((entry) =>
      prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId ?? null,
          userEmail: entry.userEmail ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          description: entry.description,
          previousData: entry.previousData ?? undefined,
          newData: entry.newData ?? undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          bookId: entry.bookId ?? null,
          borrowerId: entry.borrowerId ?? null,
          loanId: entry.loanId ?? null,
        },
      })
    )
  );
}
