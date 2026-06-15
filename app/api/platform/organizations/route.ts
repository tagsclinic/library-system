import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, requirePlatformAuth, serialize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAuth();
  if (isErrorResponse(auth)) return auth;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "all";

  const organizations = await prisma.organization.findMany({
    where: {
      ...(status === "active" ? { deletedAt: null } : {}),
      ...(status === "suspended" ? { deletedAt: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
          books: true,
          borrowers: true,
          loans: true,
        },
      },
    },
  });

  return NextResponse.json(serialize({ data: organizations }));
}
