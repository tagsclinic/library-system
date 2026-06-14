import {
  AuditAction,
  NotificationType,
  SubscriptionPlan,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_TERMS = `By borrowing materials from this library, you agree to:
• Return items by the due date in the same condition
• Report damage or loss promptly
• Accept responsibility for replacement or repair costs for lost or damaged items
• Follow all library policies as updated from time to time`;

const DEFAULT_NOTIFICATION_TEMPLATES = [
  {
    type: NotificationType.DUE_SOON,
    subject: "Reminder: {title} is due soon",
    body: "Hello {borrowerName},\n\nYour loan for \"{title}\" by {author} is due on {dueDate}. Please return it to {libraryName} or request a renewal.\n\nThank you!",
  },
  {
    type: NotificationType.OVERDUE,
    subject: "Overdue notice: {title}",
    body: "Hello {borrowerName},\n\nYour loan for \"{title}\" was due on {dueDate} and is now overdue. Please return it to {libraryName} as soon as possible.\n\nLoan ID: {loanId}",
  },
  {
    type: NotificationType.RENEWAL_APPROVED,
    subject: "Renewal approved: {title}",
    body: "Hello {borrowerName},\n\nYour renewal request for \"{title}\" has been approved. Your new due date is {newDueDate}.\n\nThank you,\n{libraryName}",
  },
  {
    type: NotificationType.LOST_NOTICE,
    subject: "Lost book notice: {title}",
    body: "Hello {borrowerName},\n\nThe book \"{title}\" has been marked as lost. Replacement value: {replacementValue}. Please contact {libraryName} to resolve this matter.\n\nLoan ID: {loanId}",
  },
  {
    type: NotificationType.DAMAGE_NOTICE,
    subject: "Damage notice: {title}",
    body: "Hello {borrowerName},\n\nThe book \"{title}\" was returned with damage. Repair cost: {repairCost}. Amount owed: {repairCost}.\n\nReturn date: {returnDate}\n{libraryName}",
  },
] as const;

export function slugifyLibraryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function generateUniqueSlug(baseName: string): Promise<string> {
  const base = slugifyLibraryName(baseName) || "library";
  let slug = base;
  let attempt = 0;

  while (attempt < 20) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  slug = `${base}-${Date.now().toString(36)}`;
  return slug;
}

function defaultAppSettings(libraryName: string, contactEmail: string) {
  return [
    {
      key: "library_name",
      value: libraryName,
      description: "Display name for the library",
    },
    {
      key: "max_renewals",
      value: "2",
      description: "Maximum renewals allowed per loan",
    },
    {
      key: "due_soon_days",
      value: "3",
      description: "Days before due date to send reminder",
    },
    {
      key: "fine_per_day",
      value: "0.25",
      description: "Daily overdue fine in USD",
    },
    {
      key: "defaultLoanPeriod",
      value: "TWO_WEEKS",
      description: "Default loan period type",
    },
    {
      key: "termsVersion",
      value: "1.0",
      description: "Current terms and conditions version",
    },
    {
      key: "contactEmail",
      value: contactEmail,
      description: "Library contact email",
    },
    {
      key: "contactPhone",
      value: "",
      description: "Library contact phone",
    },
  ] as const;
}

export interface ProvisionOrganizationInput {
  libraryName: string;
  adminEmail: string;
  adminFullName: string;
}

export async function provisionOrganization(input: ProvisionOrganizationInput) {
  const slug = await generateUniqueSlug(input.libraryName);

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.libraryName.trim(),
        slug,
        email: input.adminEmail,
        subscriptionPlan: SubscriptionPlan.STARTER,
        termsContent: DEFAULT_TERMS,
      },
    });

    for (const setting of defaultAppSettings(
      organization.name,
      input.adminEmail
    )) {
      await tx.appSettings.create({
        data: { organizationId: organization.id, ...setting },
      });
    }

    for (const template of DEFAULT_NOTIFICATION_TEMPLATES) {
      await tx.notificationTemplate.create({
        data: { organizationId: organization.id, ...template },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        action: AuditAction.CREATE,
        entityType: "Organization",
        entityId: organization.id,
        description: `Library account created: ${organization.name}`,
        userEmail: input.adminEmail,
        newData: {
          name: organization.name,
          slug: organization.slug,
          plan: organization.subscriptionPlan,
        },
      },
    });

    return organization;
  });
}

export async function deleteOrganization(organizationId: string) {
  await prisma.notificationTemplate.deleteMany({ where: { organizationId } });
  await prisma.appSettings.deleteMany({ where: { organizationId } });
  await prisma.auditLog.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.delete({ where: { id: organizationId } });
}

export async function linkAdminMember(input: {
  organizationId: string;
  userId: string;
  email: string;
  fullName: string;
}) {
  return prisma.organizationMember.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
      role: UserRole.ADMIN,
    },
  });
}
