"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";

interface BookDeleteDialogProps {
  book: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function BookDeleteDialog({
  book,
  open,
  onOpenChange,
  onDeleted,
}: BookDeleteDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!book) return;
    setDeleting(true);
    try {
      await fetchApi(`/api/books/${book.id}`, { method: "DELETE" });
      toast({
        title: "Book deleted",
        description: `"${book.title}" removed from catalog.`,
      });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete book",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete book?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove <strong>{book?.title}</strong> from your catalog.
            Books with an active checkout cannot be deleted. This action can be
            undone by contacting support if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Book"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
