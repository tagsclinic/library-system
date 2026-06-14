import {
  AuditAction,
  BookCondition,
  BookStatus,
  BorrowerStatus,
  LoanPeriodType,
  LoanStatus,
  NotificationType,
  PaymentStatus,
  SubscriptionPlan,
} from "@prisma/client";
import { addDays, subDays } from "date-fns";

import { prisma } from "../lib/prisma";
import { calculateDueDate } from "../lib/utils";

const ORG = {
  name: "Greenwood Library",
  slug: "greenwood-library",
  email: "library@greenwood-library.org",
  phone: "555-0199",
  subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
  termsContent:
    "By borrowing materials from Greenwood Library, you agree to return items by the due date, report damage promptly, and accept responsibility for lost or damaged items.",
} as const;

const BOOKS = [
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Classic Fiction", isbn: "9780743273565", publishedYear: 1925, publisher: "Scribner", replacementValue: 15.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Classic Fiction", isbn: "9780061120084", publishedYear: 1960, publisher: "HarperCollins", replacementValue: 16.99, condition: BookCondition.EXCELLENT, status: BookStatus.CHECKED_OUT },
  { title: "Pride and Prejudice", author: "Jane Austen", category: "Classic Fiction", isbn: "9780141439518", publishedYear: 1813, publisher: "Penguin Classics", replacementValue: 12.99, condition: BookCondition.EXCELLENT, status: BookStatus.AVAILABLE },
  { title: "The Hobbit", author: "J.R.R. Tolkien", category: "Fantasy", isbn: "9780547928227", publishedYear: 1937, publisher: "Houghton Mifflin", replacementValue: 17.99, condition: BookCondition.NEW, status: BookStatus.CHECKED_OUT },
  { title: "The Lord of the Rings", author: "J.R.R. Tolkien", category: "Fantasy", isbn: "9780544003415", publishedYear: 1954, publisher: "Mariner Books", replacementValue: 29.99, condition: BookCondition.EXCELLENT, status: BookStatus.AVAILABLE },
  { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", category: "Fantasy", isbn: "9780439708180", publishedYear: 1997, publisher: "Scholastic", replacementValue: 19.99, condition: BookCondition.GOOD, status: BookStatus.CHECKED_OUT },
  { title: "1984", author: "George Orwell", category: "Sci-Fi", isbn: "9780451524935", publishedYear: 1949, publisher: "Signet Classic", replacementValue: 14.99, condition: BookCondition.GOOD, status: BookStatus.CHECKED_OUT },
  { title: "Dune", author: "Frank Herbert", category: "Sci-Fi", isbn: "9780441172719", publishedYear: 1965, publisher: "Ace", replacementValue: 16.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "Foundation", author: "Isaac Asimov", category: "Sci-Fi", isbn: "9780553293357", publishedYear: 1951, publisher: "Bantam Spectra", replacementValue: 15.99, condition: BookCondition.GOOD, status: BookStatus.DAMAGED },
  { title: "Sapiens", author: "Yuval Noah Harari", category: "Non-Fiction", isbn: "9780062316097", publishedYear: 2011, publisher: "Harper", replacementValue: 22.99, condition: BookCondition.NEW, status: BookStatus.AVAILABLE },
  { title: "A Brief History of Time", author: "Stephen Hawking", category: "Non-Fiction", isbn: "9780553380163", publishedYear: 1988, publisher: "Bantam", replacementValue: 18.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "The Immortal Life of Henrietta Lacks", author: "Rebecca Skloot", category: "Non-Fiction", isbn: "9781400052189", publishedYear: 2010, publisher: "Crown", replacementValue: 17.99, condition: BookCondition.EXCELLENT, status: BookStatus.AVAILABLE },
  { title: "Atomic Habits", author: "James Clear", category: "Self-Help", isbn: "9780735211292", publishedYear: 2018, publisher: "Avery", replacementValue: 19.99, condition: BookCondition.GOOD, status: BookStatus.CHECKED_OUT },
  { title: "The 7 Habits of Highly Effective People", author: "Stephen R. Covey", category: "Self-Help", isbn: "9781982137274", publishedYear: 1989, publisher: "Simon & Schuster", replacementValue: 18.99, condition: BookCondition.FAIR, status: BookStatus.AVAILABLE },
  { title: "Mindset", author: "Carol S. Dweck", category: "Self-Help", isbn: "9780345472328", publishedYear: 2006, publisher: "Ballantine", replacementValue: 16.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "Good to Great", author: "Jim Collins", category: "Business", isbn: "9780066620992", publishedYear: 2001, publisher: "Harper Business", replacementValue: 21.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "Zero to One", author: "Peter Thiel", category: "Business", isbn: "9780804139298", publishedYear: 2014, publisher: "Crown Business", replacementValue: 18.99, condition: BookCondition.EXCELLENT, status: BookStatus.CHECKED_OUT },
  { title: "The Lean Startup", author: "Eric Ries", category: "Business", isbn: "9780307887894", publishedYear: 2011, publisher: "Crown Business", replacementValue: 19.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "Born a Crime", author: "Trevor Noah", category: "Memoir", isbn: "9780399588174", publishedYear: 2016, publisher: "Spiegel & Grau", replacementValue: 17.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "The Glass Castle", author: "Jeannette Walls", category: "Memoir", isbn: "9780743247542", publishedYear: 2005, publisher: "Scribner", replacementValue: 16.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "Becoming", author: "Michelle Obama", category: "Memoir", isbn: "9781524763138", publishedYear: 2018, publisher: "Crown", replacementValue: 24.99, condition: BookCondition.NEW, status: BookStatus.CHECKED_OUT },
  { title: "The Da Vinci Code", author: "Dan Brown", category: "Thriller", isbn: "9780307474278", publishedYear: 2003, publisher: "Anchor", replacementValue: 15.99, condition: BookCondition.GOOD, status: BookStatus.AVAILABLE },
  { title: "Gone Girl", author: "Gillian Flynn", category: "Thriller", isbn: "9780307588368", publishedYear: 2012, publisher: "Crown", replacementValue: 16.99, condition: BookCondition.EXCELLENT, status: BookStatus.AVAILABLE },
  { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", category: "Thriller", isbn: "9780307949486", publishedYear: 2005, publisher: "Vintage Crime", replacementValue: 17.99, condition: BookCondition.GOOD, status: BookStatus.LOST },
] as const;

const BORROWERS = [
  { fullName: "Alice Johnson", phone: "555-0101", email: "alice.j@email.com", address: "123 Oak Street", status: BorrowerStatus.ACTIVE },
  { fullName: "Bob Martinez", phone: "555-0102", email: "bob.m@email.com", address: "456 Pine Avenue", status: BorrowerStatus.ACTIVE },
  { fullName: "Carol Williams", phone: "555-0103", email: "carol.w@email.com", address: "789 Maple Drive", status: BorrowerStatus.WATCHLIST },
  { fullName: "David Chen", phone: "555-0104", email: "david.c@email.com", address: "321 Elm Court", status: BorrowerStatus.ACTIVE },
  { fullName: "Emma Thompson", phone: "555-0105", email: "emma.t@email.com", address: "654 Birch Lane", status: BorrowerStatus.ACTIVE },
  { fullName: "Frank Robinson", phone: "555-0106", email: "frank.r@email.com", address: "987 Cedar Road", status: BorrowerStatus.BLOCKED },
  { fullName: "Grace Lee", phone: "555-0107", email: "grace.l@email.com", address: "147 Willow Way", status: BorrowerStatus.ACTIVE },
  { fullName: "Henry Davis", phone: "555-0108", email: "henry.d@email.com", address: "258 Spruce Street", status: BorrowerStatus.WATCHLIST },
  { fullName: "Ivy Anderson", phone: "555-0109", email: "ivy.a@email.com", address: "369 Ash Boulevard", status: BorrowerStatus.ACTIVE },
  { fullName: "Jack Wilson", phone: "555-0110", email: "jack.w@email.com", address: "741 Poplar Place", status: BorrowerStatus.ACTIVE },
] as const;

const APP_SETTINGS = [
  { key: "library_name", value: "Greenwood Library", description: "Display name for the library" },
  { key: "max_renewals", value: "2", description: "Maximum renewals allowed per loan" },
  { key: "due_soon_days", value: "3", description: "Days before due date to send reminder" },
  { key: "fine_per_day", value: "0.25", description: "Daily overdue fine in USD" },
  { key: "defaultLoanPeriod", value: "TWO_WEEKS", description: "Default loan period type" },
  { key: "termsVersion", value: "1.0", description: "Current terms and conditions version" },
  { key: "contactEmail", value: "dmv@tagsclinic.com", description: "Library contact email" },
  { key: "contactPhone", value: "555-0199", description: "Library contact phone" },
] as const;

const NOTIFICATION_TEMPLATES = [
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

function barcodeValue(index: number): string {
  return `GW${String(index + 1).padStart(10, "0")}`;
}

function qrCodeValue(index: number): string {
  return `GWQR${String(index + 1).padStart(12, "0")}`;
}

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.conditionHistory.deleteMany();
  await prisma.renewal.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.book.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.appSettings.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
}

async function seedOrganization() {
  return prisma.organization.create({
    data: {
      name: ORG.name,
      slug: ORG.slug,
      email: ORG.email,
      phone: ORG.phone,
      subscriptionPlan: ORG.subscriptionPlan,
      termsContent: ORG.termsContent,
    },
  });
}

async function seedAppSettings(organizationId: string) {
  for (const setting of APP_SETTINGS) {
    await prisma.appSettings.create({
      data: { organizationId, ...setting },
    });
  }
}

async function seedNotificationTemplates(organizationId: string) {
  for (const template of NOTIFICATION_TEMPLATES) {
    await prisma.notificationTemplate.create({
      data: { organizationId, ...template },
    });
  }
}

async function seedBooks(organizationId: string) {
  const books = [];

  for (let i = 0; i < BOOKS.length; i++) {
    const book = BOOKS[i];
    const created = await prisma.book.create({
      data: {
        organizationId,
        title: book.title,
        author: book.author,
        category: book.category,
        isbn: book.isbn,
        barcodeValue: barcodeValue(i),
        qrCodeValue: qrCodeValue(i),
        replacementValue: book.replacementValue,
        currentCondition: book.condition,
        status: book.status,
        publishedYear: book.publishedYear,
        publisher: book.publisher,
        conditionHistory: {
          create: {
            organizationId,
            condition: book.condition,
            notes: "Initial catalog entry",
            recordedBy: "seed",
          },
        },
      },
    });
    books.push(created);
  }

  return books;
}

async function seedBorrowers(organizationId: string) {
  const borrowers = [];

  for (const borrower of BORROWERS) {
    const created = await prisma.borrower.create({
      data: { organizationId, ...borrower },
    });
    borrowers.push(created);
  }

  return borrowers;
}

async function seedLoans(
  organizationId: string,
  books: Awaited<ReturnType<typeof seedBooks>>,
  borrowers: Awaited<ReturnType<typeof seedBorrowers>>
) {
  const now = new Date();
  const staffUserId = "seed-admin-user";

  const loanConfigs: Array<{
    bookIndex: number;
    borrowerIndex: number;
    period: LoanPeriodType;
    status: LoanStatus;
    checkoutOffsetDays: number;
    returnOffsetDays?: number;
    returnCondition?: BookCondition;
    repairCost?: number;
    amountOwed?: number;
    paymentStatus?: PaymentStatus;
    withRenewal?: boolean;
  }> = [
    { bookIndex: 1, borrowerIndex: 0, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.ACTIVE, checkoutOffsetDays: 5 },
    { bookIndex: 3, borrowerIndex: 1, period: LoanPeriodType.ONE_MONTH, status: LoanStatus.OVERDUE, checkoutOffsetDays: 35 },
    { bookIndex: 5, borrowerIndex: 2, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.ACTIVE, checkoutOffsetDays: 3 },
    { bookIndex: 6, borrowerIndex: 3, period: LoanPeriodType.ONE_WEEK, status: LoanStatus.ACTIVE, checkoutOffsetDays: 2 },
    { bookIndex: 12, borrowerIndex: 4, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.ACTIVE, checkoutOffsetDays: 7 },
    { bookIndex: 15, borrowerIndex: 5, period: LoanPeriodType.ONE_MONTH, status: LoanStatus.OVERDUE, checkoutOffsetDays: 40 },
    { bookIndex: 17, borrowerIndex: 6, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.ACTIVE, checkoutOffsetDays: 10, withRenewal: true },
    { bookIndex: 20, borrowerIndex: 7, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.ACTIVE, checkoutOffsetDays: 4 },
    { bookIndex: 0, borrowerIndex: 8, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.RETURNED, checkoutOffsetDays: 30, returnOffsetDays: 14, returnCondition: BookCondition.GOOD },
    { bookIndex: 2, borrowerIndex: 9, period: LoanPeriodType.ONE_MONTH, status: LoanStatus.RETURNED, checkoutOffsetDays: 60, returnOffsetDays: 25, returnCondition: BookCondition.EXCELLENT },
    { bookIndex: 8, borrowerIndex: 2, period: LoanPeriodType.TWO_WEEKS, status: LoanStatus.DAMAGED, checkoutOffsetDays: 20, returnOffsetDays: 5, returnCondition: BookCondition.DAMAGED, repairCost: 12.5, amountOwed: 12.5, paymentStatus: PaymentStatus.PENDING },
    { bookIndex: 23, borrowerIndex: 5, period: LoanPeriodType.ONE_MONTH, status: LoanStatus.LOST, checkoutOffsetDays: 90, returnOffsetDays: 45, returnCondition: BookCondition.LOST, amountOwed: 17.99, paymentStatus: PaymentStatus.PENDING },
  ];

  for (const config of loanConfigs) {
    const book = books[config.bookIndex];
    const borrower = borrowers[config.borrowerIndex];
    const checkoutDate = subDays(now, config.checkoutOffsetDays);
    const dueDate = calculateDueDate(checkoutDate, config.period);
    const returnDate =
      config.returnOffsetDays !== undefined
        ? subDays(now, config.returnOffsetDays)
        : null;

    const loan = await prisma.loan.create({
      data: {
        organizationId,
        bookId: book.id,
        borrowerId: borrower.id,
        checkoutDate,
        dueDate,
        returnDate,
        loanPeriodType: config.period,
        checkoutCondition: book.currentCondition,
        returnCondition: config.returnCondition ?? null,
        checkoutNotes: "Checked out via seed data",
        returnNotes: returnDate ? "Returned via seed data" : null,
        termsAccepted: true,
        termsAcceptedAt: checkoutDate,
        termsVersion: "1.0",
        status: config.status,
        repairCost: config.repairCost ?? null,
        amountOwed: config.amountOwed ?? null,
        paymentStatus: config.paymentStatus ?? null,
        checkedOutBy: staffUserId,
        checkedInBy: returnDate ? staffUserId : null,
        conditionHistory: returnDate
          ? {
              create: {
                organizationId,
                bookId: book.id,
                condition: config.returnCondition ?? book.currentCondition,
                notes: "Condition recorded at return",
                recordedBy: staffUserId,
              },
            }
          : undefined,
        renewals: config.withRenewal
          ? {
              create: {
                organizationId,
                oldDueDate: dueDate,
                newDueDate: addDays(dueDate, 14),
                reason: "Borrower requested extension",
                approvedBy: staffUserId,
              },
            }
          : undefined,
      },
    });

    if (config.status === LoanStatus.ACTIVE || config.status === LoanStatus.OVERDUE) {
      await prisma.book.update({
        where: { id: book.id },
        data: { status: BookStatus.CHECKED_OUT },
      });
    }

    if (config.status === LoanStatus.RETURNED) {
      await prisma.book.update({
        where: { id: book.id },
        data: {
          status: BookStatus.AVAILABLE,
          currentCondition: config.returnCondition ?? book.currentCondition,
        },
      });
    }

    if (config.status === LoanStatus.DAMAGED) {
      await prisma.book.update({
        where: { id: book.id },
        data: { status: BookStatus.DAMAGED, currentCondition: BookCondition.DAMAGED },
      });
    }

    if (config.status === LoanStatus.LOST) {
      await prisma.book.update({
        where: { id: book.id },
        data: { status: BookStatus.LOST, currentCondition: BookCondition.LOST },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: staffUserId,
        userEmail: "admin@greenwood-library.org",
        action: AuditAction.CHECKOUT,
        entityType: "Loan",
        entityId: loan.id,
        description: `Seeded checkout: ${book.title} to ${borrower.fullName}`,
        bookId: book.id,
        borrowerId: borrower.id,
        loanId: loan.id,
      },
    });

    if (returnDate) {
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: staffUserId,
          userEmail: "admin@greenwood-library.org",
          action: AuditAction.CHECKIN,
          entityType: "Loan",
          entityId: loan.id,
          description: `Seeded check-in: ${book.title} from ${borrower.fullName}`,
          bookId: book.id,
          borrowerId: borrower.id,
          loanId: loan.id,
        },
      });
    }

    if (config.withRenewal) {
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: staffUserId,
          userEmail: "admin@greenwood-library.org",
          action: AuditAction.RENEWAL,
          entityType: "Renewal",
          entityId: loan.id,
          description: `Seeded renewal: ${book.title} for ${borrower.fullName}`,
          bookId: book.id,
          borrowerId: borrower.id,
          loanId: loan.id,
        },
      });
    }
  }
}

async function seedAuditLogs(
  organizationId: string,
  books: Awaited<ReturnType<typeof seedBooks>>,
  borrowers: Awaited<ReturnType<typeof seedBorrowers>>
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: "seed-admin-user",
      userEmail: "admin@greenwood-library.org",
      action: AuditAction.CREATE,
      entityType: "Organization",
      entityId: organizationId,
      description: `Created organization "${ORG.name}"`,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: "seed-admin-user",
      userEmail: "admin@greenwood-library.org",
      action: AuditAction.CREATE,
      entityType: "Book",
      entityId: books[0].id,
      description: `Cataloged "${books[0].title}"`,
      bookId: books[0].id,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: "seed-admin-user",
      userEmail: "admin@greenwood-library.org",
      action: AuditAction.CREATE,
      entityType: "Borrower",
      entityId: borrowers[0].id,
      description: `Registered borrower "${borrowers[0].fullName}"`,
      borrowerId: borrowers[0].id,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: "seed-admin-user",
      userEmail: "admin@greenwood-library.org",
      action: AuditAction.LOGIN,
      entityType: "User",
      description: "Staff login (seed)",
    },
  });
}

async function main() {
  console.log("Clearing existing data...");
  await clearDatabase();

  console.log("Creating organization...");
  const organization = await seedOrganization();

  console.log("Seeding app settings...");
  await seedAppSettings(organization.id);

  console.log("Seeding notification templates...");
  await seedNotificationTemplates(organization.id);

  console.log("Seeding books...");
  const books = await seedBooks(organization.id);
  console.log(`  Created ${books.length} books`);

  console.log("Seeding borrowers...");
  const borrowers = await seedBorrowers(organization.id);
  console.log(`  Created ${borrowers.length} borrowers`);

  console.log("Seeding loans...");
  await seedLoans(organization.id, books, borrowers);

  console.log("Seeding additional audit logs...");
  await seedAuditLogs(organization.id, books, borrowers);

  console.log("\n========================================");
  console.log("Seed completed successfully.");
  console.log("========================================");
  console.log("\nSet this organization_id in Supabase user_metadata:");
  console.log(`  organization_id: "${organization.id}"`);
  console.log("\nExample Supabase user metadata:");
  console.log(
    JSON.stringify(
      {
        role: "ADMIN",
        full_name: "Library Admin",
        organization_id: organization.id,
      },
      null,
      2
    )
  );
  console.log("========================================\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
