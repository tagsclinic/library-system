"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/books/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load book");
        setBook(json.data);
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

  if (loading) return <LoadingSpinner className="py-12" />;
  if (!book) return <p className="text-muted-foreground">Book not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={book.title}
        description={`by ${book.author}`}
        action={
          <Button asChild>
            <Link href={`/books/${book.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
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
