"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, Loader2, Unplug } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
  folderName: string;
  connectedAt: string | null;
}

export function GoogleDriveSettings() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/google-drive");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load integration");
      setStatus(json.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load Google Drive status",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "1") {
      toast({
        title: "Google Drive connected",
        description: "Book cover photos will be saved to your Drive folder.",
      });
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Google Drive connection failed",
        description: decodeURIComponent(error),
      });
    }
  }, [searchParams, toast]);

  async function handleConnect() {
    setWorking(true);
    try {
      const res = await fetch("/api/integrations/google-drive/authorize");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start Google sign-in");
      window.location.href = json.data.url;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setWorking(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Drive? Existing cover links may stop working.")) {
      return;
    }

    setWorking(true);
    try {
      const res = await fetch("/api/integrations/google-drive", {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Disconnect failed");
      toast({ title: "Google Drive disconnected" });
      void loadStatus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Disconnect failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-5 w-5" />
          Google Drive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.configured ? (
          <p className="text-sm text-muted-foreground">
            Google Drive is not configured on this server yet. Ask your platform
            administrator to add <code className="text-xs">GOOGLE_CLIENT_ID</code>{" "}
            and <code className="text-xs">GOOGLE_CLIENT_SECRET</code>.
          </p>
        ) : status.connected ? (
          <>
            <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-medium">Connected</p>
              <p className="mt-1">
                Account: {status.email ?? "Google account"}
              </p>
              <p>Folder: {status.folderName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Book cover photos upload to your tenant&apos;s Google Drive folder
              automatically when you add or edit books.
            </p>
            <Button
              variant="outline"
              disabled={working}
              onClick={() => void handleDisconnect()}
            >
              {working ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="mr-2 h-4 w-4" />
              )}
              Disconnect Google Drive
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your library&apos;s Google Drive account so book cover photos
              are stored in a dedicated <strong>{status.folderName}</strong> folder.
            </p>
            <Button disabled={working} onClick={() => void handleConnect()}>
              {working ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-2 h-4 w-4" />
              )}
              Sign in with Google Drive
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
