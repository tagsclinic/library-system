"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserFormDialog } from "@/components/platform/UserFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/types";

interface PlatformUserRow {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  organizationId: string | null;
  isSuperAdmin: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    deletedAt: string | null;
  } | null;
}

export default function PlatformUsersPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PlatformUserRow[]>([]);
  const [organizations, setOrganizations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);

    try {
      const [usersRes, orgsRes] = await Promise.all([
        fetch(`/api/platform/users?${params}`),
        fetch("/api/platform/organizations?status=active"),
      ]);
      const usersJson = await usersRes.json();
      const orgsJson = await orgsRes.json();

      if (!usersRes.ok) {
        throw new Error(usersJson.error ?? "Failed to load users");
      }

      setRows(
        (usersJson.data ?? []).map(
          (row: PlatformUserRow & { id?: string }) => ({
            userId: row.userId,
            email: row.email,
            fullName: row.fullName,
            role: row.role,
            organizationId: row.organizationId || null,
            isSuperAdmin: row.isSuperAdmin,
            organization: row.organization,
          })
        )
      );
      setOrganizations(
        (orgsJson.data ?? []).map((org: { id: string; name: string }) => ({
          id: org.id,
          name: org.name,
        }))
      );
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load users",
      });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchRows(), 300);
    return () => clearTimeout(timer);
  }, [fetchRows]);

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user permanently? This cannot be undone.")) {
      return;
    }

    setDeletingId(userId);
    try {
      const res = await fetch(`/api/platform/users/${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast({ title: "User deleted" });
      void fetchRows();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Add, edit, or remove users across all libraries"
        action={
          <Button
            onClick={() => {
              setEditingUser(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">
                      {row.fullName ?? "—"}
                    </TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      {row.organization?.name ?? (
                        <span className="text-muted-foreground">Platform only</span>
                      )}
                    </TableCell>
                    <TableCell>{row.isSuperAdmin ? "—" : row.role}</TableCell>
                    <TableCell>
                      {row.isSuperAdmin ? (
                        <Badge className="bg-violet-600 hover:bg-violet-600">
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Library user</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingUser(row);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === row.userId}
                          onClick={() => void handleDelete(row.userId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizations={organizations}
        user={editingUser}
        onSuccess={() => {
          setDialogOpen(false);
          setEditingUser(null);
          void fetchRows();
        }}
      />
    </div>
  );
}
