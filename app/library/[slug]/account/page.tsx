"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PublicLibraryHeader } from "@/components/public/PublicLibraryHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function PublicAccountPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    borrower: { fullName: string; email: string | null; status: string };
    organization: { name: string; logo: string | null } | null;
    reservations: Array<{
      id: string;
      status: string;
      createdAt: string;
      book: { title: string; author: string };
    }>;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/public/borrower/me");
        if (res.status === 401) {
          router.push(`/library/${slug}/login?redirectTo=/library/${slug}/account`);
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load account");
        setData(json.data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load account",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, router, toast]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/library/${slug}`);
    router.refresh();
  }

  if (loading) return <LoadingSpinner className="min-h-screen py-20" />;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {data.organization ? (
        <PublicLibraryHeader
          slug={slug}
          name={data.organization.name}
          logo={data.organization.logo}
        />
      ) : null}

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My account</h1>
            <p className="text-muted-foreground">{data.borrower.fullName}</p>
          </div>
          <Button variant="outline" onClick={() => void handleLogout()}>
            Sign out
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Account status</span>
              <Badge>{data.borrower.status}</Badge>
            </div>
            {data.borrower.status === "PENDING" ? (
              <p className="text-sm text-amber-700">
                Your account is waiting for librarian approval before you can reserve books.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My reservations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reservations yet.{" "}
                <Link href={`/library/${slug}`} className="text-primary hover:underline">
                  Browse the catalog
                </Link>
              </p>
            ) : (
              data.reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{reservation.book.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {reservation.book.author}
                    </p>
                  </div>
                  <Badge variant="secondary">{reservation.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Button asChild>
          <Link href={`/library/${slug}`}>Browse catalog</Link>
        </Button>
      </main>
    </div>
  );
}
