"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Loader2, Pencil } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BookCondition, BookStatus, LoanStatus } from "@/types";

interface SiblingCopy {
  id: string;
  copyNumber: number | null;
  barcodeValue: string;
  status: BookStatus;
  currentCondition: BookCondition;
}

interface BookDetail {
  id: string;
  title: string;
  author: string;
  category: string | null;
  isbn: string | null;
  barcodeValue: string;
  coverImageUrl: string | null;
  status: BookStatus;
  currentCondition: BookCondition;
  replacementValue: string | null;
  notes: string | null;
  publishedYear: number | null;
  publisher: string | null;
  copyNumber: number | null;
  copyGroupId: string | null;
  copyStats: { copyNumber: number | null; total: number } | null;
  siblingCopies: SiblingCopy[];
  loans: Array<{
    id: string;
    status: LoanStatus;
    checkoutDate: string;
    dueDate: string;
    returnDate: string | null;
    borrower: { fullName: string };
  }>;
  conditionHistory: Array<{
    id: string;
    condition: BookCondition;
    notes: string | null;
    recordedAt: string;
    recordedBy: string | null;
  }>;
}

export default function BookDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateCopies, setDuplicateCopies] = useState(1);
  const [duplicating, setDuplicating] = useState(false);

  async function loadBook() {
    const res = await fetch(`/api/books/${params.id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load book");
    setBook(json.data);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadBook();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load book",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, toast]);

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/books/${params.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copies: duplicateCopies }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to duplicate book");

      const created = json.data?.copiesCreated ?? duplicateCopies;
      toast({
        title: created > 1 ? `${created} copies added` : "Copy added",
        description: `"${book?.title}" duplicated successfully.`,
      });
      setDuplicateOpen(false);
      await loadBook();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to duplicate book",
      });
    } finally {
      setDuplicating(false);
    }
  }

  if (loading) return <LoadingSpinner className="py-12" />;
  if (!book) return <p className="text-muted-foreground">Book not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={book.title}
        description={`by ${book.author}`}
        action={
          <div className="flex gap-2">
            <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Duplicate book</DialogTitle>
                  <DialogDescription>
                    Create additional copies of &ldquo;{book.title}&rdquo; with the same
                    details and unique barcodes.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="duplicate-copies">Number of copies to add</Label>
                  <Input
                    id="duplicate-copies"
                    type="number"
                    min={1}
                    max={50}
                    value={duplicateCopies}
                    onChange={(e) =>
                      setDuplicateCopies(
                        Math.min(50, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDuplicateOpen(false)}
                    disabled={duplicating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleDuplicate} disabled={duplicating}>
                    {duplicating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      "Add copies"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button asChild>
              <Link href={`/books/${book.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {book.coverImageUrl ? (
          <Card className="overflow-hidden lg:col-span-2">
            <CardContent className="flex items-center gap-6 p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.coverImageUrl}
                alt={`Cover of ${book.title}`}
                className="h-48 w-32 rounded-lg border object-cover shadow-sm"
              />
              <div>
                <p className="text-sm font-medium">Cover photo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stored in your library&apos;s Google Drive
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Book Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={book.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Condition</span>
              <span>{book.currentCondition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{book.category ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ISBN</span>
              <span>{book.isbn ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barcode</span>
              <span className="font-mono">{book.barcodeValue}</span>
            </div>
            {book.copyNumber ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Copy</span>
                <span>
                  {book.copyNumber}
                  {book.copyStats?.total
                    ? ` of ${book.copyStats.total}`
                    : null}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Replacement Value</span>
              <span>{formatCurrency(book.replacementValue)}</span>
            </div>
            {book.notes ? (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1">{book.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan History</CardTitle>
          </CardHeader>
          <CardContent>
            {book.loans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No loan history.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Checkout</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {book.loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.borrower.fullName}</TableCell>
                      <TableCell>{formatDate(loan.checkoutDate)}</TableCell>
                      <TableCell>{formatDate(loan.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={loan.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {book.siblingCopies?.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Other Copies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Copy #</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {book.siblingCopies.map((copy) => (
                  <TableRow key={copy.id}>
                    <TableCell>{copy.copyNumber ?? "—"}</TableCell>
                    <TableCell className="font-mono">{copy.barcodeValue}</TableCell>
                    <TableCell>
                      <StatusBadge status={copy.status} />
                    </TableCell>
                    <TableCell>{copy.currentCondition}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/books/${copy.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Condition History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {book.conditionHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.recordedAt)}</TableCell>
                  <TableCell>{entry.condition}</TableCell>
                  <TableCell>{entry.notes ?? "—"}</TableCell>
                  <TableCell>{entry.recordedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
