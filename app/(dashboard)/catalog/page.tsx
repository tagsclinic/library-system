"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookStatus } from "@/types";

interface CatalogBook {
  id: string;
  title: string;
  author: string;
  category: string | null;
  isbn: string | null;
  status: BookStatus;
  currentCondition: string;
  coverImageUrl: string | null;
}

const CATEGORIES = [
  "Classic Fiction",
  "Fantasy",
  "Sci-Fi",
  "Non-Fiction",
  "Self-Help",
  "Business",
  "Memoir",
  "Thriller",
];

export default function CatalogPage() {
  const { toast } = useToast();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search) params.set("q", search);
    if (category !== "all") params.set("category", category);

    try {
      const res = await fetch(`/api/books?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load catalog");
      setBooks(json.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load catalog",
      });
    } finally {
      setLoading(false);
    }
  }, [search, category, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog"
        description="Browse the library collection"
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, or ISBN..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : books.length === 0 ? (
        <p className="text-center text-muted-foreground">No books found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                    {book.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  <h3 className="line-clamp-2 font-semibold leading-tight">
                    {book.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={book.status} />
                    {book.category ? (
                      <span className="text-xs text-muted-foreground">
                        {book.category}
                      </span>
                    ) : null}
                  </div>
                  {book.isbn ? (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {book.isbn}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
