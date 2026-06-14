export const ORGANIZATION_TYPES = [
  { value: "PUBLIC_LIBRARY", label: "Public Library" },
  { value: "SCHOOL", label: "School" },
  { value: "PRIVATE_SCHOOL", label: "Private School" },
  { value: "CHURCH", label: "Church" },
  { value: "MOSQUE", label: "Mosque" },
  { value: "NONPROFIT", label: "Nonprofit" },
  { value: "COMMUNITY_CENTER", label: "Community Center" },
  { value: "OTHER", label: "Other" },
] as const;

export type OrganizationTypeValue =
  (typeof ORGANIZATION_TYPES)[number]["value"];

export const ORGANIZATION_NAME_EXAMPLES = [
  "Springfield Public Library",
  "Al Noor Islamic Center",
  "St. Mary's Church Library",
  "Lincoln Elementary School",
] as const;

export const SIGNUP_FEATURES = [
  "Track Books",
  "Manage Borrowers",
  "Barcode Scanning",
  "Reports",
  "Renewals",
] as const;

export const MAX_LOGO_SIZE_BYTES = 512 * 1024;

export const ACCEPTED_LOGO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
