"use client";

import { useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";

export function BackupSettings() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function exportBackup() {
    setExporting(true);
    try {
      const response = await fetch("/api/backup/export");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `library-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Backup downloaded",
        description: "Your library data export is ready.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  async function importBackup(file: File | null) {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await fetchApi<{
        data: {
          booksImported: number;
          borrowersImported: number;
          settingsImported: number;
          errors: string[];
        };
      }>("/api/backup/import", {
        method: "POST",
        body: formData,
      });

      toast({
        title: "Import complete",
        description: `Updated ${result.data.borrowersImported} borrowers, ${result.data.booksImported} books, and ${result.data.settingsImported} settings.`,
      });

      if (result.data.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Import warnings",
          description: result.data.errors.slice(0, 3).join(" "),
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: err instanceof Error ? err.message : "Import failed",
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>
          Download a full Excel backup or import borrower/settings updates from a
          previous export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportBackup} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Backup (Excel)
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Import backup file</p>
          <Input
            type="file"
            accept=".xlsx,.csv"
            disabled={importing}
            onChange={(event) => importBackup(event.target.files?.[0] ?? null)}
          />
          {importing ? (
            <p className="text-sm text-muted-foreground">Importing backup...</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Includes books, borrowers, loans, and settings sheets. New books should
            still be added through the catalog; import updates existing records safely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
