"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  LIBRARIAN: "Librarian / Staff",
  VIEWER: "Viewer",
};

interface MemberRow {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}

export function TeamSettings() {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("VIEWER");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load team");
      setMembers(json.data ?? []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load team",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  function openCreate() {
    setEditing(null);
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("VIEWER");
    setDialogOpen(true);
  }

  function openEdit(member: MemberRow) {
    setEditing(member);
    setEmail(member.email);
    setPassword("");
    setFullName(member.fullName ?? "");
    setRole(member.role);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(
        editing ? `/api/members/${editing.userId}` : "/api/members",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing
              ? {
                  fullName,
                  role,
                  ...(password ? { password } : {}),
                }
              : { email, password, fullName, role }
          ),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      toast({
        title: editing ? "Team member updated" : "Team member added",
      });
      setDialogOpen(false);
      void fetchMembers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Remove this team member? Their login will be deleted.")) {
      return;
    }

    setDeletingId(userId);
    try {
      const res = await fetch(`/api/members/${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast({ title: "Team member removed" });
      void fetchMembers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Team members</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              The account created at signup is the primary admin. Add viewers,
              librarians/staff, and additional admins for your library.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.fullName ?? "—"}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === member.userId}
                          onClick={() => void handleDelete(member.userId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit team member" : "Add team member"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update name, role, or reset password."
                : "Create a login for someone on your library team."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            {!editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-password">Password</Label>
                  <Input
                    id="member-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="member-name">Full name</Label>
              <Input
                id="member-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="LIBRARIAN">Librarian / Staff</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editing ? (
              <div className="space-y-2">
                <Label htmlFor="member-new-password">New password (optional)</Label>
                <Input
                  id="member-new-password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Add user"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
