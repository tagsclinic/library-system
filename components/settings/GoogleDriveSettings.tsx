"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, Loader2, Save, Unplug } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";

interface DriveStatus {
  configured: boolean;
  hasTenantCredentials: boolean;
  clientId: string | null;
  redirectUri: string;
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
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchApi<{ data: DriveStatus }>(
        "/api/integrations/google-drive"
      );
      setStatus(result.data);
      setClientId(result.data.clientId ?? "");
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

  async function handleSaveCredentials() {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        variant: "destructive",
        title: "Missing credentials",
        description: "Enter both Client ID and Client Secret.",
      });
      return;
    }

    setWorking(true);
    try {
      await fetchApi("/api/integrations/google-drive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });
      setClientSecret("");
      toast({
        title: "Google credentials saved",
        description: status?.connected
          ? "Reconnect Google Drive to apply the new credentials."
          : "You can now sign in with Google Drive.",
      });
      void loadStatus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save credentials",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setWorking(false);
    }
  }

  async function handleConnect() {
    setWorking(true);
    try {
      const result = await fetchApi<{ data: { url: string } }>(
        "/api/integrations/google-drive/authorize"
      );
      window.location.href = result.data.url;
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
      await fetchApi("/api/integrations/google-drive", { method: "DELETE" });
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
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Google OAuth credentials</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create OAuth credentials in{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Google Cloud Console
              </a>{" "}
              and add this redirect URI:
            </p>
            <code className="mt-2 block break-all rounded bg-muted px-2 py-1 text-xs">
              {status?.redirectUri}
            </code>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="google-client-id">Client ID</Label>
              <Input
                id="google-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789.apps.googleusercontent.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-client-secret">Client Secret</Label>
              <PasswordInput
                id="google-client-secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={
                  status?.hasTenantCredentials
                    ? "Enter new secret to update"
                    : "Your OAuth client secret"
                }
              />
            </div>
          </div>

          <Button disabled={working} onClick={() => void handleSaveCredentials()}>
            {working ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Credentials
          </Button>
        </div>

        {!status?.configured ? (
          <p className="text-sm text-muted-foreground">
            Save your Google OAuth Client ID and Client Secret above, then sign in
            to connect your library&apos;s Drive folder.
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
              Book cover photos upload to your library&apos;s Google Drive folder
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
              are stored in a dedicated <strong>{status?.folderName}</strong>{" "}
              folder.
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
