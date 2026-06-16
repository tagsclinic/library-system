"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { CreditCard, Loader2, Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";
import { BorrowerStatus } from "@/types";

interface CardData {
  borrower: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    status: BorrowerStatus;
  };
  organization?: { name?: string };
  card: {
    libraryId: string;
    qrCodeValue: string;
    status: BorrowerStatus;
    walletReady: {
      passType: string;
      serialNumber: string;
      organizationName: string;
      appleWalletSupported: boolean;
    };
  };
}

export default function BorrowerCardPage() {
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CardData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchApi<{ data: CardData }>(
          `/api/borrowers/${params.id}/card`
        );
        setData(result.data);
        const qr = await QRCode.toDataURL(result.data.card.qrCodeValue, {
          width: 220,
          margin: 1,
        });
        setQrDataUrl(qr);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load card",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, toast]);

  function printCard() {
    if (!data) return;
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Library Card</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; }
            .card { border: 2px solid #111; border-radius: 16px; padding: 24px; max-width: 420px; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            .meta { color: #555; margin-bottom: 16px; }
            .row { margin: 8px 0; }
            img { margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${data.organization?.name ?? "Library"}</h1>
            <div class="meta">Borrower Library Card</div>
            <div class="row"><strong>Name:</strong> ${data.borrower.fullName}</div>
            <div class="row"><strong>Library ID:</strong> ${data.card.libraryId}</div>
            <div class="row"><strong>Phone:</strong> ${data.borrower.phone}</div>
            <div class="row"><strong>Status:</strong> ${data.borrower.status}</div>
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR code" width="180" />` : ""}
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <LoadingSpinner className="py-12" />;
  if (!data) return <p className="text-muted-foreground">Card not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Library Card"
        description="Borrower ID card with QR code for checkout and check-in"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={printCard}>
              <Printer className="mr-2 h-4 w-4" />
              Print Card
            </Button>
            <Button asChild variant="outline">
              <Link href={`/borrowers/${params.id}`}>Back to Profile</Link>
            </Button>
          </div>
        }
      />

      <Card className="mx-auto max-w-md overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {data.organization?.name ?? "Library"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Borrower</p>
            <p className="text-xl font-semibold">{data.borrower.fullName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Library ID</p>
              <p className="font-mono font-medium">{data.card.libraryId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={data.borrower.status} />
            </div>
          </div>
          <div className="flex justify-center rounded-lg border bg-white p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Borrower QR code" className="h-44 w-44" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin" />
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Scan at checkout or check-in · Apple Wallet support coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
