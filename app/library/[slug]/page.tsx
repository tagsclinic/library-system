"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Search } from "lucide-react";

import { PublicLibraryHeader } from "@/components/public/PublicLibraryHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookStatus } from "@/types";

interface PublicBook {
  id: string;
  title: string;
  author: string;
  category: string | null;
  status: BookStatus;
  coverImageUrl: string | null;
}

interface OrgInfo {
  name: string;
  slug: string;
  logo: string | null;
}

export default function PublicCatalogPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, booksRes] = await Promise.all([
        fetch(`/api/public/${slug}`),
        fetch(
          `/api/public/${slug}/books?${new URLSearchParams({
            ...(search ? { q: search } : {}),
            ...(category !== "all" ? { category } : {}),
          })}`
        ),
      ]);

      const orgJson = await orgRes.json();
      const booksJson = await booksRes.json();

      if (orgRes.ok) setOrg(orgJson.data);
      if (booksRes.ok) {
        setBooks(booksJson.data?.books ?? []);
        setCategories(booksJson.data?.categories ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, search, category]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  if (!org && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Library catalog not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {org ? <PublicLibraryHeader slug={slug} name={org.name} logo={org.logo} /> : null}

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse our collection</h1>
          <p className="mt-2 text-muted-foreground">
            Search available books and reserve titles with a free patron account.
          </p>
        </div>

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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : books.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No books found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link key={book.id} href={`/library/${slug}/books/${book.id}`}>
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    <div className="flex h-40 items-center justify-center bg-muted/40">
                      {book.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 font-semibold">{book.title}</h2>
                        <Badge variant={book.status === "AVAILABLE" ? "default" : "secondary"}>
                          {book.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      {book.category ? (
                        <p className="text-xs text-muted-foreground">{book.category}</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
