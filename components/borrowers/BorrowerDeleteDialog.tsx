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

interface BorrowerDeleteDialogProps {
  borrower: { id: string; fullName: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function BorrowerDeleteDialog({
  borrower,
  open,
  onOpenChange,
  onDeleted,
}: BorrowerDeleteDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!borrower) return;
    setDeleting(true);
    try {
      await fetchApi(`/api/borrowers/${borrower.id}`, { method: "DELETE" });
      toast({
        title: "Borrower deleted",
        description: `"${borrower.fullName}" removed from your records.`,
      });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete borrower",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete borrower?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove <strong>{borrower?.fullName}</strong> from your
            borrower records. Borrowers with an active loan cannot be deleted —
            check the book in first.
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
              "Delete Borrower"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
