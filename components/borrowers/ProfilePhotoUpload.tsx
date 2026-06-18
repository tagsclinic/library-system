"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ProfilePhotoUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function ProfilePhotoUpload({
  value,
  onChange,
  onError,
  disabled = false,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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

        const res = await fetch("/api/borrowers/upload-photo", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? "Upload failed");
        }

        onChange(json.data?.photoUrl ?? null);
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Could not upload photo"
        );
      } finally {
        setLoading(false);
      }
    },
    [onChange, onError]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/30 transition-colors",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Borrower profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-8 w-8 text-muted-foreground" />
        )}
      </button>

      <div className="space-y-1">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP, GIF · Max 5 MB
        </p>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={disabled || loading}
            onClick={() => onChange(null)}
          >
            <X className="mr-1 h-3 w-3" />
            Remove photo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
