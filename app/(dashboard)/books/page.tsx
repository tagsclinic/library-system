"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Pencil, Plus, Search, Trash2, CopyPlus } from "lucide-react";

import {
  BookDeleteDialog,
} from "@/components/books/BookDeleteDialog";
import {
  BookDuplicateVolumeDialog,
  type BookDuplicateVolumeTarget,
} from "@/components/books/BookDuplicateVolumeDialog";
import {
  BookQuickEditDialog,
  type BookQuickEditTarget,
} from "@/components/books/BookQuickEditDialog";
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
import { fetchApi } from "@/lib/fetch-api";
import { BookStatus } from "@/types";

interface BookRow extends BookQuickEditTarget {
  barcodeValue: string;
  coverImageUrl: string | null;
  copyNumber: number | null;
  copyStats: { total: number; available: number } | null;
}

export default function BooksPage() {
  const { toast } = useToast();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [editBook, setEditBook] = useState<BookRow | null>(null);
  const [deleteBook, setDeleteBook] = useState<BookRow | null>(null);
  const [duplicateBook, setDuplicateBook] = useState<BookDuplicateVolumeTarget | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);

    try {
      const result = await fetchApi<{ data: BookRow[] }>(`/api/books?${params}`);
      setBooks(result.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load books",
      });
    } finally {
      setLoading(false);
    }
  }, [search, status, category, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  const categories = [...new Set(books.map((b) => b.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book Catalog"
        description="Browse and manage the library collection"
        action={
          <Button asChild>
            <Link href="/books/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, ISBN..."
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
            {Object.values(BookStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c!}>
                {c}
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
                <TableHead className="w-[56px]">Cover</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Copies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No books found
                  </TableCell>
                </TableRow>
              ) : (
                books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <Link href={`/books/${book.id}`} className="block h-14 w-10 overflow-hidden rounded border bg-muted/40">
                        {book.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/books/${book.id}`}
                        className="hover:underline"
                      >
                        {book.title}
                      </Link>
                    </TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>{book.category ?? "—"}</TableCell>
                    <TableCell>{book.isbn ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {book.copyStats ? (
                        <>
                          {book.copyNumber ? `Copy ${book.copyNumber} · ` : null}
                          {book.copyStats.available} avail / {book.copyStats.total} total
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={book.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/books/${book.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Duplicate as new volume"
                          onClick={() => setDuplicateBook(book)}
                        >
                          <CopyPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Quick edit"
                          onClick={() => setEditBook(book)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete book"
                          onClick={() => setDeleteBook(book)}
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

      <BookQuickEditDialog
        book={editBook}
        open={Boolean(editBook)}
        onOpenChange={(open) => !open && setEditBook(null)}
        onSaved={fetchBooks}
      />

      <BookDuplicateVolumeDialog
        book={duplicateBook}
        open={Boolean(duplicateBook)}
        onOpenChange={(open) => !open && setDuplicateBook(null)}
        onCreated={fetchBooks}
      />

      <BookDeleteDialog
        book={deleteBook}
        open={Boolean(deleteBook)}
        onOpenChange={(open) => !open && setDeleteBook(null)}
        onDeleted={fetchBooks}
      />
    </div>
  );
}
