"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_LOGO_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from "@/lib/signup/constants";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  onError?: (message: string) => void;
}

export function LogoUpload({ value, onChange, onError }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (
        !ACCEPTED_LOGO_TYPES.includes(
          file.type as (typeof ACCEPTED_LOGO_TYPES)[number]
        )
      ) {
        onError?.("Please upload a JPG, PNG, or WebP image.");
        return;
      }

      if (file.size > MAX_LOGO_SIZE_BYTES) {
        onError?.("Logo must be smaller than 512 KB.");
        return;
      }

      setLoading(true);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        onChange(dataUrl);
      } catch {
        onError?.("Could not read the image file.");
      } finally {
        setLoading(false);
      }
    },
    [onChange, onError]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Organization logo preview"
            className="h-16 w-16 rounded-lg border object-contain bg-white"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Logo uploaded</p>
            <p className="text-xs text-muted-foreground">
              You can change this later in Settings.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            aria-label="Remove logo"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Upload organization logo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag & drop or click to browse · JPG, PNG, WebP · Max 512 KB
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Optional</span>
        </button>
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
