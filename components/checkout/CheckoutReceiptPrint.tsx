"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export interface CheckoutReceiptData {
  libraryName: string;
  borrowerName: string;
  borrowerPhone?: string | null;
  bookTitle: string;
  bookAuthor: string;
  barcode?: string | null;
  isbn?: string | null;
  checkoutDate: string;
  dueDate: string;
  termsAccepted: boolean;
  termsVersion: string;
  loanId?: string;
}

export function CheckoutReceiptPrint({ data }: { data: CheckoutReceiptData }) {
  function printReceipt() {
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Checkout Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h1 { font-size: 22px; margin: 0 0 4px; }
            .sub { color: #555; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            td { padding: 8px 0; vertical-align: top; }
            td.label { width: 160px; color: #555; }
            .footer { margin-top: 28px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${data.libraryName}</h1>
          <div class="sub">Book Checkout Receipt</div>
          <table>
            <tr><td class="label">Borrower</td><td>${data.borrowerName}</td></tr>
            ${data.borrowerPhone ? `<tr><td class="label">Phone</td><td>${data.borrowerPhone}</td></tr>` : ""}
            <tr><td class="label">Book</td><td>${data.bookTitle} by ${data.bookAuthor}</td></tr>
            ${data.barcode ? `<tr><td class="label">Barcode</td><td>${data.barcode}</td></tr>` : ""}
            ${data.isbn ? `<tr><td class="label">ISBN</td><td>${data.isbn}</td></tr>` : ""}
            <tr><td class="label">Checkout Date</td><td>${formatDate(data.checkoutDate)}</td></tr>
            <tr><td class="label">Due Date</td><td>${formatDate(data.dueDate)}</td></tr>
            <tr><td class="label">Terms Accepted</td><td>${data.termsAccepted ? "Yes" : "No"} (v${data.termsVersion})</td></tr>
            ${data.loanId ? `<tr><td class="label">Loan ID</td><td>${data.loanId}</td></tr>` : ""}
          </table>
          <div class="footer">Thank you for using ${data.libraryName}.</div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <Button type="button" variant="outline" onClick={printReceipt}>
      <Printer className="mr-2 h-4 w-4" />
      Print Receipt
    </Button>
  );
}
