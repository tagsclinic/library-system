"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const REPORT_TYPES = [
  {
    id: "checked-out",
    label: "Checked Out",
    description: "Currently checked-out and overdue loans",
  },
  {
    id: "overdue",
    label: "Overdue",
    description: "Loans past their due date",
  },
  {
    id: "available",
    label: "Available",
    description: "Books available for checkout",
  },
  {
    id: "damaged-lost",
    label: "Damaged & Lost",
    description: "Damaged books and lost item records",
  },
  {
    id: "renewals",
    label: "Renewals",
    description: "Renewal history and extensions",
  },
  {
    id: "borrower-activity",
    label: "Borrower Activity",
    description: "Borrower loan statistics and status",
  },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["id"];

export default function ReportsPage() {
  const { toast } = useToast();
  const [activeType, setActiveType] = useState<ReportType>("overdue");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${activeType}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load report");

      const rows = json.data ?? [];
      setData(rows);
      if (rows.length > 0) {
        setColumns(Object.keys(rows[0]));
      } else {
        setColumns([]);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load report",
      });
    } finally {
      setLoading(false);
    }
  }, [activeType, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function exportReport(format: "csv" | "xlsx") {
    const url = `/api/reports?type=${activeType}&format=${format}`;
    window.open(url, "_blank");
    toast({
      title: "Export started",
      description: `Downloading ${activeType} report as ${format.toUpperCase()}.`,
    });
  }

  const activeReport = REPORT_TYPES.find((r) => r.id === activeType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export library reports"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportReport("csv")}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        }
      />

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as ReportType)}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {REPORT_TYPES.map((report) => (
            <TabsTrigger key={report.id} value={report.id}>
              {report.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORT_TYPES.map((report) => (
          <TabsContent key={report.id} value={report.id}>
            <Card>
              <CardHeader>
                <CardTitle>{report.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner className="py-8" />
                ) : data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data for this report.</p>
                ) : (
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map((col) => (
                            <TableHead key={col}>
                              {col.replace(/([A-Z])/g, " $1").trim()}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row, i) => (
                          <TableRow key={i}>
                            {columns.map((col) => (
                              <TableCell key={col}>
                                {String(row[col] ?? "—")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {activeReport && (
        <p className="text-xs text-muted-foreground">
          Showing {data.length} records for {activeReport.label}
        </p>
      )}
    </div>
  );
}
