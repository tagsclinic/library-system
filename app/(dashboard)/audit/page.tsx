"use client";

import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { AuditAction } from "@/types";

interface AuditRow {
  id: string;
  action: AuditAction;
  entityType: string;
  description: string;
  userEmail: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (search) params.set("q", search);

    try {
      const res = await fetch(`/api/audit?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load audit log");
      setLogs(json.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load audit log",
      });
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchAudit, 300);
    return () => clearTimeout(timer);
  }, [fetchAudit]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="System activity and change history"
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Search descriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.values(AuditAction).map((a) => (
              <SelectItem key={a} value={a}>
                {a.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No audit entries found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {log.description}
                    </TableCell>
                    <TableCell>{log.userEmail ?? "System"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
