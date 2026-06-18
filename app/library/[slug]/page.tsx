"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Flame, Search, Sparkles } from "lucide-react";

import { BookCarousel } from "@/components/public/BookCarousel";
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
  const [newArrivals, setNewArrivals] = useState<PublicBook[]>([]);
  const [popular, setPopular] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
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

  useEffect(() => {
    async function loadHighlights() {
      setHighlightsLoading(true);
      try {
        const res = await fetch(`/api/public/${slug}/highlights`);
        const json = await res.json();
        if (res.ok) {
          setNewArrivals(json.data?.newArrivals ?? []);
          setPopular(json.data?.popular ?? []);
        }
      } finally {
        setHighlightsLoading(false);
      }
    }
    void loadHighlights();
  }, [slug]);

  const isBrowsing = search.trim().length > 0 || category !== "all";

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

      <div className="border-b bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-white">
        <main className="mx-auto max-w-6xl space-y-5 px-4 py-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {org ? `Welcome to ${org.name}` : "Browse our collection"}
            </h1>
            <p className="mt-2 text-blue-100">
              Search available books and reserve titles with a free patron account.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, ISBN..."
                className="border-0 bg-white pl-9 text-slate-900 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full border-0 bg-white text-slate-900 shadow-sm sm:w-[200px]">
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
        </main>
      </div>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        {!isBrowsing && !highlightsLoading ? (
          <>
            <BookCarousel
              title="New Arrivals"
              description="Just added to the catalog"
              icon={Sparkles}
              slug={slug}
              books={newArrivals}
            />
            <BookCarousel
              title="Most Popular"
              description="The most checked-out titles at this library"
              icon={Flame}
              slug={slug}
              books={popular}
            />
          </>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            {isBrowsing ? "Search results" : "Browse the Full Collection"}
          </h2>

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
        </section>
      </main>
    </div>
  );
}
