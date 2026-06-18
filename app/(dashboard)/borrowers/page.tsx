"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2, User } from "lucide-react";

import { BorrowerDeleteDialog } from "@/components/borrowers/BorrowerDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
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
import { BorrowerStatus } from "@/types";

interface BorrowerRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  status: BorrowerStatus;
}

function borrowerCardId(id: string): string {
  return id.slice(-8).toUpperCase();
}

export default function BorrowersPage() {
  const { toast } = useToast();
  const [borrowers, setBorrowers] = useState<BorrowerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<BorrowerRow | null>(null);

  const fetchBorrowers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);

    try {
      const res = await fetch(`/api/borrowers?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load borrowers");
      setBorrowers(json.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load borrowers",
      });
    } finally {
      setLoading(false);
    }
  }, [search, status, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchBorrowers, 300);
    return () => clearTimeout(timer);
  }, [fetchBorrowers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrowers"
        description="Manage library borrowers"
        action={
          <Button asChild>
            <Link href="/borrowers/new">
              <Plus className="mr-2 h-4 w-4" />
              New Borrower
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(BorrowerStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Borrower ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No borrowers found
                  </TableCell>
                </TableRow>
              ) : (
                borrowers.map((borrower) => (
                  <TableRow key={borrower.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                          {borrower.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={borrower.photoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        {borrower.fullName}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {borrowerCardId(borrower.id)}
                    </TableCell>
                    <TableCell>{borrower.phone}</TableCell>
                    <TableCell>{borrower.email ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={borrower.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/borrowers/${borrower.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit borrower"
                          asChild
                        >
                          <Link href={`/borrowers/${borrower.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete borrower"
                          onClick={() => setDeleteTarget(borrower)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <BorrowerDeleteDialog
        borrower={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={fetchBorrowers}
      />
    </div>
  );
}
