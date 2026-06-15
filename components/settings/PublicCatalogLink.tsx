"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function PublicCatalogLink() {
  const { toast } = useToast();
  const [slug, setSlug] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/catalog-link");
      const json = await res.json();
      if (res.ok) {
        setSlug(json.data?.slug ?? null);
        setPublicUrl(json.data?.publicUrl ?? "");
      }
    })();
  }, []);

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link copied", description: "Public catalog URL copied to clipboard." });
  }

  if (!slug) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Public catalog link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Share this link on your website so patrons can browse your inventory, create
          an account, and request book reservations.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={publicUrl} />
          <Button type="button" variant="outline" size="icon" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
