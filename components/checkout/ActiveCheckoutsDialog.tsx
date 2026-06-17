"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";
import { formatDate } from "@/lib/utils";
import { BookCondition, LoanStatus, PaymentStatus } from "@/types";

interface ActiveLoanRow {
  id: string;
  status: LoanStatus;
  checkoutDate: string;
  dueDate: string;
  checkoutCondition: BookCondition;
  book: {
    id: string;
    title: string;
    author: string;
    barcodeValue: string;
  };
  borrower: {
    id: string;
    fullName: string;
    phone: string;
  };
}

interface ActiveCheckoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function ActiveCheckoutsDialog({
  open,
  onOpenChange,
  onChanged,
}: ActiveCheckoutsDialogProps) {
  const { toast } = useToast();
  const [loans, setLoans] = useState<ActiveLoanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [busyLoanId, setBusyLoanId] = useState<string | null>(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ active: "true", limit: "100" });
      if (search.trim()) params.set("q", search.trim());

      const result = await fetchApi<{ data: ActiveLoanRow[] }>(
        `/api/loans?${params}`
      );
      setLoans(result.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not load checkouts",
        description: err instanceof Error ? err.message : "Failed to load loans",
      });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(loadLoans, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, loadLoans, search]);

  const overdueCount = useMemo(
    () => loans.filter((loan) => loan.status === LoanStatus.OVERDUE).length,
    [loans]
  );

  async function updateStatus(loanId: string, status: LoanStatus) {
    setBusyLoanId(loanId);
    try {
      await fetchApi(`/api/loans/${loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-status", status }),
      });
      toast({ title: "Status updated" });
      await loadLoans();
      onChanged?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update status",
      });
    } finally {
      setBusyLoanId(null);
    }
  }

  async function checkInLoan(loan: ActiveLoanRow) {
    setBusyLoanId(loan.id);
    try {
      await fetchApi(`/api/loans/${loan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: loan.id,
          returnCondition: loan.checkoutCondition,
          returnNotes: "Checked in from active checkouts list",
          paymentStatus: PaymentStatus.PENDING,
          markAsLost: false,
          markAsDamaged: false,
        }),
      });
      toast({
        title: "Check-in complete",
        description: `"${loan.book.title}" returned to catalog.`,
      });
      await loadLoans();
      onChanged?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: err instanceof Error ? err.message : "Could not check in book",
      });
    } finally {
      setBusyLoanId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Active Checkouts</DialogTitle>
          <DialogDescription>
            All books currently checked out. Update status or check in manually.
            {overdueCount > 0 ? ` ${overdueCount} overdue.` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search book, borrower, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loans.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No books are currently checked out.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Checked Out</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div className="font-medium">{loan.book.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {loan.book.barcodeValue}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{loan.borrower.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {loan.borrower.phone}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(loan.checkoutDate)}</TableCell>
                    <TableCell>{formatDate(loan.dueDate)}</TableCell>
                    <TableCell>
                      <Select
                        value={loan.status}
                        disabled={busyLoanId === loan.id}
                        onValueChange={(value) =>
                          updateStatus(loan.id, value as LoanStatus)
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={LoanStatus.ACTIVE}>ACTIVE</SelectItem>
                          <SelectItem value={LoanStatus.OVERDUE}>OVERDUE</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyLoanId === loan.id}
                        onClick={() => checkInLoan(loan)}
                      >
                        {busyLoanId === loan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Check In
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{loans.length} open checkout{loans.length === 1 ? "" : "s"}</span>
          <Button variant="ghost" size="sm" onClick={loadLoans} disabled={loading}>
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
