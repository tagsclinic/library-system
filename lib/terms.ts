export const TERMS_VERSION = "1.0";

export const BOOK_AGREEMENT_TITLE = "Terms and Conditions of the Book Agreement";

export const BOOK_AGREEMENT_SECTIONS = [
  {
    title: "1. Borrowing Responsibility",
    body: "The borrower agrees to care for all library materials while they are checked out and to return them by the due date shown on the checkout receipt.",
  },
  {
    title: "2. Condition of Materials",
    body: "Books must be returned in the same condition as when borrowed. The borrower accepts responsibility for damage, loss, or theft that occurs while the item is checked out.",
  },
  {
    title: "3. Fees and Replacement",
    body: "Lost, stolen, or damaged materials may result in repair or replacement fees based on the library's replacement value for the item. Fees must be paid before future borrowing privileges are restored.",
  },
  {
    title: "4. Overdue Items",
    body: "Overdue items should be returned as soon as possible. Repeated overdue returns may affect borrowing privileges.",
  },
  {
    title: "5. Library Rules",
    body: "The borrower agrees to follow all library policies, including limits on concurrent loans, renewals, and acceptable use of library resources.",
  },
  {
    title: "6. Agreement",
    body: "By accepting this agreement, the borrower confirms they understand these terms and agree to comply with them for every checkout.",
  },
];

export function getBookAgreementText(libraryName?: string): string {
  const header = libraryName
    ? `${BOOK_AGREEMENT_TITLE}\n${libraryName}\n`
    : `${BOOK_AGREEMENT_TITLE}\n`;

  const body = BOOK_AGREEMENT_SECTIONS.map(
    (section) => `${section.title}\n${section.body}`
  ).join("\n\n");

  return `${header}\n${body}\n\nVersion ${TERMS_VERSION}`;
}
