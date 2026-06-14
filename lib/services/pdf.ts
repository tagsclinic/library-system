import { jsPDF } from "jspdf";

import { BRAND } from "@/lib/brand";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReceiptData {
  libraryName: string;
  libraryAddress?: string;
  libraryPhone?: string;
  type: "checkout" | "return" | "agreement" | "overdue" | "damage";
  bookTitle: string;
  bookAuthor: string;
  borrowerName: string;
  borrowerPhone?: string;
  dueDate?: string;
  returnDate?: string;
  checkoutDate?: string;
  condition?: string;
  amountOwed?: number;
  loanId?: string;
  termsVersion?: string;
}

function addHeader(doc: jsPDF, libraryName: string) {
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(libraryName, 20, 20);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(BRAND.tagline, 20, 27);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 32, 190, 32);
}

function addFooter(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(BRAND.footerText, 20, 285);
  doc.text(`Generated ${formatDate(new Date())}`, 140, 285);
}

export function generateReceiptPdf(data: ReceiptData): Buffer {
  const doc = new jsPDF();
  addHeader(doc, data.libraryName);

  const titles: Record<ReceiptData["type"], string> = {
    checkout: "Checkout Receipt",
    return: "Return Receipt",
    agreement: "Borrower Agreement",
    overdue: "Overdue Notice",
    damage: "Damage Report",
  };

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(titles[data.type], 20, 45);

  let y = 58;
  const line = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, y);
    doc.setTextColor(15, 23, 42);
    doc.text(value, 70, y);
    y += 10;
  };

  line("Book:", `${data.bookTitle} by ${data.bookAuthor}`);
  line("Borrower:", data.borrowerName);
  if (data.borrowerPhone) line("Phone:", data.borrowerPhone);
  if (data.checkoutDate) line("Checkout Date:", formatDate(data.checkoutDate));
  if (data.dueDate) line("Due Date:", formatDate(data.dueDate));
  if (data.returnDate) line("Return Date:", formatDate(data.returnDate));
  if (data.condition) line("Condition:", data.condition);
  if (data.amountOwed != null) line("Amount Owed:", formatCurrency(data.amountOwed));
  if (data.loanId) line("Loan ID:", data.loanId);
  if (data.termsVersion) line("Terms Version:", data.termsVersion);

  if (data.type === "agreement") {
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "By checking out materials, the borrower agrees to return items by the due date in the same condition. Lost or damaged items may incur replacement fees.",
      20,
      y,
      { maxWidth: 170 }
    );
  }

  addFooter(doc);
  return Buffer.from(doc.output("arraybuffer"));
}

export function generateReceiptDataUrl(data: ReceiptData): string {
  const buffer = generateReceiptPdf(data);
  return `data:application/pdf;base64,${buffer.toString("base64")}`;
}
