import {
  BookStatus,
  LoanStatus,
} from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { isErrorResponse, notDeleted, requireAuth, serialize } from "@/lib/api-helpers";
import { canViewReports } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const REPORT_TYPES = [
  "checked-out",
  "overdue",
  "available",
  "damaged-lost",
  "renewals",
  "borrower-activity",
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  return lines.join("\n");
}

function toExcelBuffer(rows: Record<string, unknown>[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function getCheckedOutReport(organizationId: string) {
  const loans = await prisma.loan.findMany({
    where: {
      organizationId,
      ...notDeleted(),
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
    },
    include: {
      book: { select: { title: true, author: true, barcodeValue: true } },
      borrower: { select: { fullName: true, phone: true, email: true } },
    },
    orderBy: { checkoutDate: "desc" },
  });

  return loans.map((loan) => ({
    loanId: loan.id,
    bookTitle: loan.book.title,
    author: loan.book.author,
    barcode: loan.book.barcodeValue,
    borrower: loan.borrower.fullName,
    phone: loan.borrower.phone,
    email: loan.borrower.email ?? "",
    checkoutDate: loan.checkoutDate.toISOString(),
    dueDate: loan.dueDate.toISOString(),
    status: loan.status,
  }));
}

async function getOverdueReport(organizationId: string) {
  const now = new Date();
  const loans = await prisma.loan.findMany({
    where: {
      organizationId,
      ...notDeleted(),
      OR: [
        { status: LoanStatus.OVERDUE },
        { status: LoanStatus.ACTIVE, dueDate: { lt: now } },
      ],
    },
    include: {
      book: { select: { title: true, author: true, barcodeValue: true } },
      borrower: { select: { fullName: true, phone: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return loans.map((loan) => ({
    loanId: loan.id,
    bookTitle: loan.book.title,
    author: loan.book.author,
    barcode: loan.book.barcodeValue,
    borrower: loan.borrower.fullName,
    phone: loan.borrower.phone,
    email: loan.borrower.email ?? "",
    dueDate: loan.dueDate.toISOString(),
    daysOverdue: Math.max(
      0,
      Math.floor((now.getTime() - loan.dueDate.getTime()) / 86400000)
    ),
    status: loan.status,
  }));
}

async function getAvailableReport(organizationId: string) {
  const books = await prisma.book.findMany({
    where: {
      organizationId,
      ...notDeleted(),
      status: BookStatus.AVAILABLE,
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      author: true,
      category: true,
      isbn: true,
      barcodeValue: true,
      currentCondition: true,
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category ?? "",
    isbn: book.isbn ?? "",
    barcode: book.barcodeValue,
    condition: book.currentCondition,
  }));
}

async function getDamagedLostReport(organizationId: string) {
  const [books, loans] = await Promise.all([
    prisma.book.findMany({
      where: {
        organizationId,
        ...notDeleted(),
        status: { in: [BookStatus.LOST, BookStatus.DAMAGED] },
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        author: true,
        status: true,
        currentCondition: true,
        replacementValue: true,
      },
    }),
    prisma.loan.findMany({
      where: {
        organizationId,
        ...notDeleted(),
        status: { in: [LoanStatus.LOST, LoanStatus.DAMAGED] },
      },
      orderBy: { returnDate: "desc" },
      include: {
        book: { select: { title: true, author: true } },
        borrower: { select: { fullName: true } },
      },
    }),
  ]);

  const bookRows = books.map((book) => ({
    recordType: "book",
    id: book.id,
    title: book.title,
    author: book.author,
    status: book.status,
    condition: book.currentCondition,
    replacementValue: book.replacementValue
      ? Number(book.replacementValue)
      : "",
    borrower: "",
    amountOwed: "",
  }));

  const loanRows = loans.map((loan) => ({
    recordType: "loan",
    id: loan.id,
    title: loan.book.title,
    author: loan.book.author,
    status: loan.status,
    condition: loan.returnCondition ?? "",
    replacementValue: "",
    borrower: loan.borrower.fullName,
    amountOwed: loan.amountOwed ? Number(loan.amountOwed) : "",
  }));

  return [...bookRows, ...loanRows];
}

async function getRenewalsReport(organizationId: string) {
  const renewals = await prisma.renewal.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      loan: {
        include: {
          book: { select: { title: true, author: true } },
          borrower: { select: { fullName: true } },
        },
      },
    },
  });

  return renewals.map((renewal) => ({
    renewalId: renewal.id,
    loanId: renewal.loanId,
    bookTitle: renewal.loan.book.title,
    author: renewal.loan.book.author,
    borrower: renewal.loan.borrower.fullName,
    oldDueDate: renewal.oldDueDate.toISOString(),
    newDueDate: renewal.newDueDate.toISOString(),
    reason: renewal.reason ?? "",
    approvedBy: renewal.approvedBy ?? "",
    createdAt: renewal.createdAt.toISOString(),
  }));
}

async function getBorrowerActivityReport(organizationId: string) {
  const borrowers = await prisma.borrower.findMany({
    where: { organizationId, ...notDeleted() },
    orderBy: { fullName: "asc" },
    include: {
      _count: {
        select: {
          loans: { where: { deletedAt: null } },
        },
      },
      loans: {
        where: { deletedAt: null },
        select: { status: true },
      },
    },
  });

  return borrowers.map((b) => {
    const activeLoans = b.loans.filter(
      (l) => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE
    ).length;
    const overdueLoans = b.loans.filter(
      (l) => l.status === LoanStatus.OVERDUE
    ).length;

    return {
      id: b.id,
      fullName: b.fullName,
      phone: b.phone,
      email: b.email ?? "",
      status: b.status,
      totalLoans: b._count.loans,
      activeLoans,
      overdueLoans,
      createdAt: b.createdAt.toISOString(),
    };
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canViewReports(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { organizationId } = auth;
  const { searchParams } = request.nextUrl;
  const type = (searchParams.get("type") ?? "overdue") as ReportType;
  const format = searchParams.get("format");

  if (!REPORT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid report type. Valid types: ${REPORT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case "checked-out":
      rows = await getCheckedOutReport(organizationId);
      break;
    case "overdue":
      rows = await getOverdueReport(organizationId);
      break;
    case "available":
      rows = await getAvailableReport(organizationId);
      break;
    case "damaged-lost":
      rows = await getDamagedLostReport(organizationId);
      break;
    case "renewals":
      rows = await getRenewalsReport(organizationId);
      break;
    case "borrower-activity":
      rows = await getBorrowerActivityReport(organizationId);
      break;
  }

  if (format === "csv") {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const buffer = toExcelBuffer(rows, type);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
      },
    });
  }

  return NextResponse.json(
    serialize({
      type,
      count: rows.length,
      data: rows,
    })
  );
}
