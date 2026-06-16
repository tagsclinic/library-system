import { BorrowerStatus, NotificationStatus, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/notifications";

export async function sendNewBookAnnouncement(input: {
  organizationId: string;
  bookTitle: string;
  bookAuthor: string;
  notifyMode: "NONE" | "ALL" | "SELECTED";
  notifyMessage?: string | null;
  selectedBorrowerIds?: string[];
  libraryName?: string;
}) {
  if (input.notifyMode === "NONE") {
    return { sent: 0, skipped: 0 };
  }

  const where =
    input.notifyMode === "SELECTED" && input.selectedBorrowerIds?.length
      ? {
          organizationId: input.organizationId,
          deletedAt: null,
          status: BorrowerStatus.ACTIVE,
          id: { in: input.selectedBorrowerIds },
          email: { not: null },
        }
      : {
          organizationId: input.organizationId,
          deletedAt: null,
          status: BorrowerStatus.ACTIVE,
          email: { not: null },
        };

  const borrowers = await prisma.borrower.findMany({
    where,
    select: { id: true, email: true, fullName: true },
  });

  const message =
    input.notifyMessage?.trim() ||
    `A new book is now available at ${input.libraryName ?? "your library"}.`;

  let sent = 0;
  let skipped = 0;

  for (const borrower of borrowers) {
    if (!borrower.email) {
      skipped += 1;
      continue;
    }

    const result = await sendEmail({
      organizationId: input.organizationId,
      to: borrower.email,
      type: NotificationType.NEW_BOOK,
      variables: {
        borrowerName: borrower.fullName,
        title: input.bookTitle,
        author: input.bookAuthor,
        libraryName: input.libraryName ?? "Library",
        message,
      },
    });

    if (result.status === NotificationStatus.SENT) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped };
}
