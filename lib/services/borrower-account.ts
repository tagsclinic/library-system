import { BorrowerStatus } from "@prisma/client";

import { BORROWER_ACCOUNT_TYPE } from "@/lib/borrower-auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findFirst({
    where: { slug, deletedAt: null, publicCatalogEnabled: true },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      email: true,
      phone: true,
      organizationType: true,
    },
  });
}

export async function registerBorrowerAccount(input: {
  organizationId: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address?: string | null;
}) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const admin = createAdminClient();

  const existingBorrower = await prisma.borrower.findFirst({
    where: {
      organizationId: input.organizationId,
      email: normalizedEmail,
      deletedAt: null,
    },
  });

  if (existingBorrower) {
    throw new Error("An account with this email already exists for this library");
  }

  const { data: listData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const existingAuth = listData?.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail
  );

  if (existingAuth) {
    throw new Error("This email is already registered. Try signing in instead.");
  }

  const borrower = await prisma.borrower.create({
    data: {
      organizationId: input.organizationId,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: normalizedEmail,
      address: input.address?.trim() || null,
      status: BorrowerStatus.PENDING,
    },
  });

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      account_type: BORROWER_ACCOUNT_TYPE,
      borrower_id: borrower.id,
      organization_id: input.organizationId,
      full_name: input.fullName.trim(),
    },
  });

  if (authError || !authData.user) {
    await prisma.borrower.delete({ where: { id: borrower.id } });
    throw new Error(authError?.message ?? "Failed to create account");
  }

  await prisma.borrower.update({
    where: { id: borrower.id },
    data: { authUserId: authData.user.id },
  });

  return { borrower, userId: authData.user.id };
}
