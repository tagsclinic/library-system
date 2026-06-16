"use client";

import { Input } from "@/components/ui/input";
import { formatPhoneNumber } from "@/lib/phone";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  placeholder = "(619) 777-9046",
}: PhoneInputProps) {
  return (
    <Input
      type="tel"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="tel"
      onChange={(event) => onChange(formatPhoneNumber(event.target.value))}
    />
  );
}
