import * as XLSX from "xlsx";
import { LoanStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function appendSheet<T extends Record<string, unknown>>(
  workbook: XLSX.WorkBook,
  name: string,
  rows: T[]
) {
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ note: "No records" }]),
    name
  );
}

export async function exportOrganizationBackup(organizationId: string) {
  const [
    organization,
    books,
    borrowers,
    loans,
    reservations,
    renewals,
    settings,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, organizationType: true },
    }),
    prisma.book.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { title: "asc" },
    }),
    prisma.borrower.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { fullName: "asc" },
    }),
    prisma.loan.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { checkoutDate: "desc" },
      include: {
        book: {
          select: {
            title: true,
            author: true,
            barcodeValue: true,
            qrCodeValue: true,
          },
        },
        borrower: { select: { fullName: true, phone: true, email: true } },
      },
    }),
    prisma.bookReservation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        book: { select: { title: true, barcodeValue: true } },
        borrower: { select: { fullName: true, phone: true } },
      },
    }),
    prisma.renewal.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        loan: {
          include: {
            book: { select: { title: true, barcodeValue: true } },
            borrower: { select: { fullName: true, phone: true } },
          },
        },
      },
    }),
    prisma.appSettings.findMany({
      where: { organizationId },
      orderBy: { key: "asc" },
    }),
  ]);

  const openStatuses = new Set<LoanStatus>([
    LoanStatus.ACTIVE,
    LoanStatus.OVERDUE,
  ]);
  const closedStatuses = new Set<LoanStatus>([
    LoanStatus.RETURNED,
    LoanStatus.LOST,
    LoanStatus.DAMAGED,
  ]);

  const checkouts = loans.filter((loan) => openStatuses.has(loan.status));
  const checkins = loans.filter(
    (loan) =>
      closedStatuses.has(loan.status) ||
      loan.returnDate !== null
  );

  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, "Organization", [
    {
      organizationId: organization?.id,
      name: organization?.name,
      slug: organization?.slug,
      type: organization?.organizationType,
      exportedAt: new Date().toISOString(),
      exportVersion: 2,
    },
  ]);

  appendSheet(
    workbook,
    "Borrowers",
    borrowers.map((borrower) => ({
      id: borrower.id,
      fullName: borrower.fullName,
      phone: borrower.phone,
      email: borrower.email,
      address: borrower.address,
      status: borrower.status,
      notes: borrower.notes,
      createdAt: borrower.createdAt.toISOString(),
      updatedAt: borrower.updatedAt.toISOString(),
    }))
  );

  appendSheet(
    workbook,
    "Checkouts",
    checkouts.map((loan) => ({
      id: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book.title,
      bookAuthor: loan.book.author,
      bookBarcode: loan.book.barcodeValue,
      bookQrCode: loan.book.qrCodeValue,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrower.fullName,
      borrowerPhone: loan.borrower.phone,
      borrowerEmail: loan.borrower.email,
      checkoutDate: loan.checkoutDate.toISOString(),
      dueDate: loan.dueDate.toISOString(),
      status: loan.status,
      loanPeriodType: loan.loanPeriodType,
      customDays: loan.customDays,
      checkoutCondition: loan.checkoutCondition,
      checkoutNotes: loan.checkoutNotes,
      checkedOutBy: loan.checkedOutBy,
      termsAccepted: loan.termsAccepted,
      termsAcceptedAt: loan.termsAcceptedAt?.toISOString() ?? null,
    }))
  );

  appendSheet(
    workbook,
    "Check-ins",
    checkins.map((loan) => ({
      id: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book.title,
      bookAuthor: loan.book.author,
      bookBarcode: loan.book.barcodeValue,
      bookQrCode: loan.book.qrCodeValue,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrower.fullName,
      borrowerPhone: loan.borrower.phone,
      borrowerEmail: loan.borrower.email,
      checkoutDate: loan.checkoutDate.toISOString(),
      dueDate: loan.dueDate.toISOString(),
      returnDate: loan.returnDate?.toISOString() ?? null,
      status: loan.status,
      returnCondition: loan.returnCondition,
      returnNotes: loan.returnNotes,
      checkedInBy: loan.checkedInBy,
      repairCost: loan.repairCost?.toString() ?? null,
      amountOwed: loan.amountOwed?.toString() ?? null,
      paymentStatus: loan.paymentStatus,
    }))
  );

  appendSheet(
    workbook,
    "Reservations",
    reservations.map((reservation) => ({
      id: reservation.id,
      bookId: reservation.bookId,
      bookTitle: reservation.book.title,
      bookBarcode: reservation.book.barcodeValue,
      borrowerId: reservation.borrowerId,
      borrowerName: reservation.borrower.fullName,
      borrowerPhone: reservation.borrower.phone,
      status: reservation.status,
      notes: reservation.notes,
      reviewedBy: reservation.reviewedBy,
      reviewedAt: reservation.reviewedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
    }))
  );

  appendSheet(
    workbook,
    "Renewals",
    renewals.map((renewal) => ({
      id: renewal.id,
      loanId: renewal.loanId,
      bookTitle: renewal.loan.book.title,
      bookBarcode: renewal.loan.book.barcodeValue,
      borrowerName: renewal.loan.borrower.fullName,
      borrowerPhone: renewal.loan.borrower.phone,
      oldDueDate: renewal.oldDueDate.toISOString(),
      newDueDate: renewal.newDueDate.toISOString(),
      reason: renewal.reason,
      approvedBy: renewal.approvedBy,
      createdAt: renewal.createdAt.toISOString(),
    }))
  );

  appendSheet(
    workbook,
    "Catalog",
    books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      barcodeValue: book.barcodeValue,
      qrCodeValue: book.qrCodeValue,
      barcodeImage: book.barcodeImage,
      qrCodeImage: book.qrCodeImage,
      status: book.status,
      currentCondition: book.currentCondition,
      replacementValue: book.replacementValue?.toString() ?? null,
      coverImageUrl: book.coverImageUrl,
      publishedYear: book.publishedYear,
      publisher: book.publisher,
      edition: book.edition,
      copyGroupId: book.copyGroupId,
      copyNumber: book.copyNumber,
      notes: book.notes,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    }))
  );

  appendSheet(
    workbook,
    "Settings",
    settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description,
    }))
  );

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function sheetToJson<T extends Record<string, unknown>>(
  workbook: XLSX.WorkBook,
  sheetName: string
): T[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<T>(sheet);
}

function readBooksSheet(workbook: XLSX.WorkBook) {
  const catalog = sheetToJson<Record<string, unknown>>(workbook, "Catalog");
  if (catalog.length > 0) return catalog;
  return sheetToJson<Record<string, unknown>>(workbook, "Books");
}

export async function importOrganizationBackup(
  organizationId: string,
  fileBuffer: Buffer
) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const books = readBooksSheet(workbook);
  const borrowers = sheetToJson<Record<string, unknown>>(workbook, "Borrowers");
  const settings = sheetToJson<Record<string, unknown>>(workbook, "Settings");

  const errors: string[] = [];
  let booksImported = 0;
  let borrowersImported = 0;
  let settingsImported = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of borrowers) {
      const fullName = String(row.fullName ?? "").trim();
      const phone = String(row.phone ?? "").trim();
      if (!fullName || !phone) {
        errors.push(`Skipped borrower row missing name or phone.`);
        continue;
      }

      const existing = await tx.borrower.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          OR: [{ phone }, ...(row.id ? [{ id: String(row.id) }] : [])],
        },
      });

      if (existing) {
        await tx.borrower.update({
          where: { id: existing.id },
          data: {
            fullName,
            phone,
            email: row.email ? String(row.email) : null,
            address: row.address ? String(row.address) : null,
            status: (row.status as never) ?? existing.status,
            notes: row.notes ? String(row.notes) : null,
          },
        });
      } else {
        await tx.borrower.create({
          data: {
            organizationId,
            fullName,
            phone,
            email: row.email ? String(row.email) : null,
            address: row.address ? String(row.address) : null,
            notes: row.notes ? String(row.notes) : null,
          },
        });
      }
      borrowersImported += 1;
    }

    for (const row of books) {
      const title = String(row.title ?? "").trim();
      const author = String(row.author ?? "").trim();
      const barcodeValue = String(row.barcodeValue ?? "").trim();
      if (!title || !author || !barcodeValue) {
        errors.push(`Skipped book row missing title, author, or barcode.`);
        continue;
      }

      const existing = await tx.book.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          barcodeValue,
        },
      });

      if (existing) {
        await tx.book.update({
          where: { id: existing.id },
          data: {
            title,
            author,
            category: row.category ? String(row.category) : null,
            isbn: row.isbn ? String(row.isbn) : null,
            status: (row.status as never) ?? existing.status,
            currentCondition:
              (row.currentCondition as never) ?? existing.currentCondition,
            notes: row.notes ? String(row.notes) : null,
          },
        });
      } else {
        errors.push(
          `Book "${title}" (${barcodeValue}) not found — import updates existing books only. Add new books through the catalog.`
        );
        continue;
      }
      booksImported += 1;
    }

    for (const row of settings) {
      const key = String(row.key ?? "").trim();
      if (!key) continue;
      await tx.appSettings.upsert({
        where: { organizationId_key: { organizationId, key } },
        create: {
          organizationId,
          key,
          value: String(row.value ?? ""),
          description: row.description ? String(row.description) : null,
        },
        update: { value: String(row.value ?? "") },
      });
      settingsImported += 1;
    }
  });

  return { booksImported, borrowersImported, settingsImported, errors };
}
