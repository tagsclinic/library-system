"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ReservationStatus } from "@/types";

interface ReservationRow {
  id: string;
  status: ReservationStatus;
  createdAt: string;
  book: { id: string; title: string; author: string };
  borrower: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string;
    status: string;
  };
}

export default function ReservationsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/reservations?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load reservations");
      setRows(json.data ?? []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load",
      });
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  async function reviewReservation(
    id: string,
    nextStatus: "APPROVED" | "REJECTED" | "FULFILLED"
  ) {
    setWorkingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");

      toast({
        title: nextStatus === "APPROVED" ? "Reservation approved" : "Reservation updated",
      });
      void fetchRows();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Try again",
      });
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Review patron book reservation requests and pending account activity"
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
          <SelectItem value="FULFILLED">Fulfilled</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Patron</TableHead>
                <TableHead>Patron status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No reservations found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.book.title}</p>
                      <p className="text-xs text-muted-foreground">{row.book.author}</p>
                    </TableCell>
                    <TableCell>
                      <p>{row.borrower.fullName}</p>
                      <p className="text-xs text-muted-foreground">{row.borrower.email}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.borrower.status as never} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={workingId === row.id}
                            onClick={() => void reviewReservation(row.id, "APPROVED")}
                          >
                            {workingId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={workingId === row.id}
                            onClick={() => void reviewReservation(row.id, "REJECTED")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : row.status === "APPROVED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => void reviewReservation(row.id, "FULFILLED")}
                        >
                          Mark fulfilled
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
