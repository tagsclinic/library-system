"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";

export interface QuickAddedBorrower {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
}

interface QuickAddBorrowerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (borrower: QuickAddedBorrower) => void;
}

export function QuickAddBorrowerDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickAddBorrowerDialogProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFullName("");
    setPhone("");
    setEmail("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await fetchApi<{ data: QuickAddedBorrower }>("/api/borrowers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, email: email || null }),
      });

      toast({ title: "Borrower added", description: `${fullName} is ready to check out.` });
      onCreated(result.data);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not add borrower",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
          <DialogDescription>
            Quickly add a borrower without leaving checkout. You can fill in more
            details later from their profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-add-name">Full name *</Label>
            <Input
              id="quick-add-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-add-phone">Phone *</Label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-add-email">Email</Label>
            <Input
              id="quick-add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !fullName || !phone}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add &amp; Select
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
