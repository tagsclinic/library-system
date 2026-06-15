"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";

import { PublicLibraryHeader } from "@/components/public/PublicLibraryHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface BookDetail {
  id: string;
  title: string;
  author: string;
  category: string | null;
  isbn: string | null;
  status: string;
  coverImageUrl: string | null;
  publishedYear: number | null;
  publisher: string | null;
  edition: string | null;
}

interface PatronSession {
  status: string;
}

export default function PublicBookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;
  const bookId = params.id as string;

  const [org, setOrg] = useState<{ name: string; logo: string | null } | null>(null);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [patron, setPatron] = useState<PatronSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [orgRes, bookRes, meRes] = await Promise.all([
          fetch(`/api/public/${slug}`),
          fetch(`/api/public/${slug}/books/${bookId}`),
          fetch("/api/public/borrower/me"),
        ]);
        const orgJson = await orgRes.json();
        const bookJson = await bookRes.json();
        if (orgRes.ok) setOrg(orgJson.data);
        if (bookRes.ok) setBook(bookJson.data);
        if (meRes.ok) {
          const meJson = await meRes.json();
          setPatron(meJson.data?.borrower ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, bookId]);

  async function handleReserve() {
    setReserving(true);
    try {
      const res = await fetch("/api/public/borrower/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reservation failed");

      toast({
        title: "Reservation requested",
        description: json.data?.message ?? "A librarian will review your request.",
      });
      router.push(`/library/${slug}/account`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not reserve",
        description: error instanceof Error ? error.message : "Try again",
      });
    } finally {
      setReserving(false);
    }
  }

  if (loading) return <LoadingSpinner className="min-h-screen py-20" />;
  if (!book || !org) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Book not found.</p>
      </div>
    );
  }

  const canReserve = book.status === "AVAILABLE";

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicLibraryHeader slug={slug} name={org.name} logo={org.logo} />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Button variant="ghost" asChild>
          <Link href={`/library/${slug}`}>← Back to catalog</Link>
        </Button>

        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="flex h-56 items-center justify-center rounded-xl border bg-white">
            {book.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverImageUrl}
                alt=""
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{book.title}</h1>
              <p className="mt-1 text-lg text-muted-foreground">by {book.author}</p>
            </div>
            <Badge>{book.status.replace(/_/g, " ")}</Badge>
            <div className="grid gap-2 text-sm">
              {book.category ? <p><span className="text-muted-foreground">Category:</span> {book.category}</p> : null}
              {book.isbn ? <p><span className="text-muted-foreground">ISBN:</span> {book.isbn}</p> : null}
              {book.publisher ? <p><span className="text-muted-foreground">Publisher:</span> {book.publisher}</p> : null}
              {book.publishedYear ? <p><span className="text-muted-foreground">Year:</span> {book.publishedYear}</p> : null}
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-lg font-semibold">Reserve this book</h2>
            {!canReserve ? (
              <p className="text-sm text-muted-foreground">
                This book is not available to reserve right now.
              </p>
            ) : !patron ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in or create a patron account to request a reservation.
                </p>
                <div className="flex gap-3">
                  <Button asChild>
                    <Link href={`/library/${slug}/login?redirectTo=/library/${slug}/books/${bookId}`}>
                      Sign in
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/library/${slug}/register`}>Create account</Link>
                  </Button>
                </div>
              </div>
            ) : patron.status === "PENDING" ? (
              <p className="text-sm text-amber-700">
                Your account is awaiting approval. You can reserve books once a librarian
                approves your registration.
              </p>
            ) : (
              <>
                <Textarea
                  placeholder="Optional note for the librarian..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button disabled={reserving} onClick={() => void handleReserve()}>
                  {reserving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Request reservation"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
