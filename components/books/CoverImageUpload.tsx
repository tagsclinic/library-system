"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface CoverImageUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function CoverImageUpload({
  value,
  onChange,
  onError,
  disabled = false,
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError?.("Please upload a JPG, PNG, WebP, or GIF image.");
        return;
      }

      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/books/upload-cover", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? "Upload failed");
        }

        onChange(json.data?.coverImageUrl ?? null);
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Could not upload cover image"
        );
      } finally {
        setLoading(false);
      }
    },
    [onChange, onError]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Book cover preview"
            className="h-24 w-16 rounded-md border object-cover bg-white"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Cover saved to Google Drive</p>
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || loading}
            onClick={() => onChange(null)}
            aria-label="Remove cover"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            disabled
              ? "cursor-not-allowed opacity-60"
              : dragging
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
            <p className="text-sm font-medium">Upload book cover photo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved to your library&apos;s Google Drive · JPG, PNG, WebP, GIF · Max 5 MB
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
