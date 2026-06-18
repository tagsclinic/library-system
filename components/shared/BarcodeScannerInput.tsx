"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CameraScanDialog } from "@/components/shared/CameraScanDialog";
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
  const lastKeyTimeRef = useRef<number | null>(null);
  const isScannerBurstRef = useRef(true);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Hardware barcode scanners emit every character within a few
  // milliseconds of each other. A human typing the same value manually
  // leaves much longer gaps between keystrokes. Auto-triggering a scan on
  // a short fixed debounce fires repeatedly on partial input while someone
  // is still typing, so only auto-scan when the whole input arrived as a
  // fast burst — manual typists fall back to pressing Enter or Search.
  const SCANNER_BURST_MAX_GAP_MS = 50;
  const SCANNER_DEBOUNCE_MS = 120;

  function handleChange(nextValue: string) {
    const now = Date.now();

    if (!nextValue) {
      isScannerBurstRef.current = true;
    } else if (
      lastKeyTimeRef.current !== null &&
      now - lastKeyTimeRef.current > SCANNER_BURST_MAX_GAP_MS
    ) {
      isScannerBurstRef.current = false;
    }
    lastKeyTimeRef.current = now;

    onChange(nextValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = nextValue.trim();
    if (!trimmed || !isScannerBurstRef.current) return;

    debounceRef.current = setTimeout(() => {
      onScan(trimmed);
    }, SCANNER_DEBOUNCE_MS);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = value.trim();
      if (trimmed) onScan(trimmed);
    }
  }

  function handleDetected(decodedValue: string) {
    onChange(decodedValue);
    onScan(decodedValue);
  }

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1">
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
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        title="Scan with camera"
        onClick={() => setCameraOpen(true)}
      >
        <Camera className="h-4 w-4" />
      </Button>
      <CameraScanDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={handleDetected}
      />
    </div>
  );
}
