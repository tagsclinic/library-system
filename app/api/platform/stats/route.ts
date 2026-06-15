import { NextResponse } from "next/server";

import { isErrorResponse, requirePlatformAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const [
    organizationCount,
    activeOrganizationCount,
    userCount,
    superAdminCount,
    bookCount,
    activeLoanCount,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.organizationMember.count(),
    prisma.platformUser.count(),
    prisma.book.count({ where: { deletedAt: null } }),
    prisma.loan.count({
      where: { deletedAt: null, status: "ACTIVE" },
    }),
  ]);

  return NextResponse.json({
    data: {
      organizationCount,
      activeOrganizationCount,
      userCount,
      superAdminCount,
      bookCount,
      activeLoanCount,
    },
  });
}
