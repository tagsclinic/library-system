"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";

const duplicateVolumeSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  barcodeValue: z.string().max(50).optional(),
  isbn: z.string().max(20).optional(),
});

type DuplicateVolumeValues = z.infer<typeof duplicateVolumeSchema>;

export interface BookDuplicateVolumeTarget {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  barcodeValue: string;
}

interface BookDuplicateVolumeDialogProps {
  book: BookDuplicateVolumeTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function suggestNextVolumeTitle(title: string): string {
  const volumeMatch = title.match(/(volume|vol\.?)\s*(\d+)/i);
  if (volumeMatch) {
    const next = Number(volumeMatch[2]) + 1;
    return title.replace(volumeMatch[0], `${volumeMatch[1]} ${next}`);
  }

  if (/\bVOLUME\s+\d+/i.test(title)) {
    return title.replace(/\bVOLUME\s+(\d+)/i, (_, num) => `VOLUME ${Number(num) + 1}`);
  }

  return `${title} — Volume 2`;
}

export function BookDuplicateVolumeDialog({
  book,
  open,
  onOpenChange,
  onCreated,
}: BookDuplicateVolumeDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [previewBarcode, setPreviewBarcode] = useState("");

  const form = useForm<DuplicateVolumeValues>({
    resolver: zodResolver(duplicateVolumeSchema),
    defaultValues: {
      title: "",
      barcodeValue: "",
      isbn: "",
    },
  });

  useEffect(() => {
    if (!book || !open) return;

    form.reset({
      title: suggestNextVolumeTitle(book.title),
      barcodeValue: "",
      isbn: book.isbn ?? "",
    });
    setPreviewBarcode("");
  }, [book, open, form]);

  async function loadBarcodePreview() {
    try {
      const result = await fetchApi<{ data: { barcodeValue: string } }>(
        "/api/books/preview-barcode"
      );
      const value = result.data.barcodeValue;
      setPreviewBarcode(value);
      form.setValue("barcodeValue", value);
    } catch {
      toast({
        variant: "destructive",
        title: "Could not generate barcode",
        description: "Leave blank and one will be assigned on save.",
      });
    }
  }

  useEffect(() => {
    if (book && open) {
      void loadBarcodePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, open]);

  async function onSubmit(values: DuplicateVolumeValues) {
    if (!book) return;
    setSaving(true);
    try {
      const result = await fetchApi<{ data: { id: string; title: string } }>(
        `/api/books/${book.id}/duplicate-volume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title.trim(),
            barcodeValue: values.barcodeValue?.trim() || null,
            isbn: values.isbn?.trim() || null,
          }),
        }
      );

      toast({
        title: "New volume added",
        description: `"${result.data.title}" created as a separate book.`,
      });
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not duplicate",
        description: err instanceof Error ? err.message : "Failed to create volume",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate as New Volume</DialogTitle>
          <DialogDescription>
            Create a separate book entry with the same details as &ldquo;
            {book?.title}&rdquo;. Edit the title and barcode for the new volume.
          </DialogDescription>
        </DialogHeader>

        {book ? (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Author: <span className="text-foreground">{book.author}</span>
          </p>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Tafsir Ibn Kathir — Volume 2" />
                  </FormControl>
                  <FormDescription>
                    Update the volume number or edition in the title.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="barcodeValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono"
                        placeholder="Auto-generated if blank"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Generate new barcode"
                      onClick={loadBarcodePreview}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {previewBarcode ? (
                    <FormDescription>
                      Suggested barcode: {previewBarcode}
                    </FormDescription>
                  ) : (
                    <FormDescription>
                      Each volume needs its own unique barcode.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional — edit if different" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add New Volume"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
