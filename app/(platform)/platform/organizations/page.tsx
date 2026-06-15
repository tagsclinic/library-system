"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  deletedAt: string | null;
  _count: { members: number; books: number; borrowers: number };
}

export default function PlatformOrganizationsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);

    try {
      const res = await fetch(`/api/platform/organizations?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load organizations");
      setRows(json.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load organizations",
      });
    } finally {
      setLoading(false);
    }
  }, [search, status, toast]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchRows(), 300);
    return () => clearTimeout(timer);
  }, [fetchRows]);

  async function updateOrganization(
    id: string,
    data: { subscriptionPlan?: string; suspended?: boolean }
  ) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/platform/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast({ title: "Organization updated" });
      void fetchRows();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage all libraries on the platform"
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, slug, or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Library</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Books</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={org.subscriptionPlan}
                      onValueChange={(value) =>
                        void updateOrganization(org.id, { subscriptionPlan: value })
                      }
                      disabled={savingId === org.id}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STARTER">Starter</SelectItem>
                        <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{org._count.members}</TableCell>
                  <TableCell>{org._count.books}</TableCell>
                  <TableCell>
                    <Badge variant={org.deletedAt ? "destructive" : "default"}>
                      {org.deletedAt ? "Suspended" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === org.id}
                      onClick={() =>
                        void updateOrganization(org.id, {
                          suspended: !org.deletedAt,
                        })
                      }
                    >
                      {org.deletedAt ? "Restore" : "Suspend"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
