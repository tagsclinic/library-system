"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CameraScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (value: string) => void;
}

const SCAN_REGION_ID = "camera-scan-region";

export function CameraScanDialog({
  open,
  onOpenChange,
  onDetected,
}: CameraScanDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(SCAN_REGION_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (stoppingRef.current) return;
            stoppingRef.current = true;
            onDetected(decodedText);
            onOpenChange(false);
          },
          undefined
        );
      } catch {
        if (!cancelled) {
          setError(
            "Could not access the camera. Check that this device has a camera, that you've allowed camera access, and that the page is loaded over HTTPS."
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      stoppingRef.current = false;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan with Camera</DialogTitle>
          <DialogDescription>
            Point your camera at a barcode or QR code. No barcode reader needed.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div
            id={SCAN_REGION_ID}
            className="overflow-hidden rounded-md border bg-black"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
