"use client";

import { useEffect, useRef } from "react";
import { ScanLine } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BarcodeScannerInputProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function BarcodeScannerInput({
  value,
  onChange,
  onScan,
  placeholder = "Scan barcode or type ISBN...",
  autoFocus = true,
  disabled = false,
  className,
  id,
}: BarcodeScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  function handleChange(nextValue: string) {
    onChange(nextValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = nextValue.trim();
    if (!trimmed) return;

    debounceRef.current = setTimeout(() => {
      onScan(trimmed);
    }, 120);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = value.trim();
      if (trimmed) onScan(trimmed);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="pl-9 font-mono"
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
      />
    </div>
  );
}
