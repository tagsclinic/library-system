export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneDigits(value: string): string {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function formatPhoneNumber(value: string): string {
  const digits = normalizePhoneDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidPhoneNumber(value: string): boolean {
  return normalizePhoneDigits(value).length === 10;
}

export function formatPhoneForDisplay(value: string | null | undefined): string {
  if (!value) return "—";
  const formatted = formatPhoneNumber(value);
  return formatted || value;
}
