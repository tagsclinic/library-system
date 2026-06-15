import { NextRequest, NextResponse } from "next/server";

import { serialize } from "@/lib/api-helpers";
import {
  getOrganizationBySlug,
  registerBorrowerAccount,
} from "@/lib/services/borrower-account";
import { publicBorrowerRegisterSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ error: "Library not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = publicBorrowerRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const { borrower } = await registerBorrowerAccount({
      organizationId: organization.id,
      ...parsed.data,
    });

    return NextResponse.json(
      serialize({
        data: {
          borrowerId: borrower.id,
          message:
            "Account created. A librarian will review your request before you can reserve books.",
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    const status = message.toLowerCase().includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
