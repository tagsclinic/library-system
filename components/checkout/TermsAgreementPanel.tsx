"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BOOK_AGREEMENT_SECTIONS,
  BOOK_AGREEMENT_TITLE,
  TERMS_VERSION,
  getBookAgreementText,
} from "@/lib/terms";

interface TermsAgreementPanelProps {
  libraryName?: string;
}

export function TermsAgreementPanel({ libraryName }: TermsAgreementPanelProps) {
  function printAgreement() {
    const text = getBookAgreementText(libraryName);
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${BOOK_AGREEMENT_TITLE}</title>
          <style>
            body { font-family: Georgia, serif; padding: 32px; color: #111; line-height: 1.6; }
            h1 { font-size: 22px; margin-bottom: 8px; }
            h2 { font-size: 15px; margin: 18px 0 6px; }
            p { margin: 0 0 12px; font-size: 14px; }
            .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <h1>${BOOK_AGREEMENT_TITLE}</h1>
          ${libraryName ? `<div class="meta">${libraryName}</div>` : ""}
          ${BOOK_AGREEMENT_SECTIONS.map(
            (section) =>
              `<h2>${section.title}</h2><p>${section.body}</p>`
          ).join("")}
          <p class="meta">Version ${TERMS_VERSION}</p>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{BOOK_AGREEMENT_TITLE}</h3>
          <p className="text-sm text-muted-foreground">
            Please review before accepting. Version {TERMS_VERSION}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={printAgreement}>
          <Printer className="mr-2 h-4 w-4" />
          Print Agreement
        </Button>
      </div>
      <div className="h-56 overflow-y-auto rounded-md border p-4">
        <div className="space-y-4 pr-3 text-sm">
          {BOOK_AGREEMENT_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="font-medium">{section.title}</p>
              <p className="text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
