"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/types";

interface OrganizationOption {
  id: string;
  name: string;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: OrganizationOption[];
  user?: {
    userId: string;
    email: string;
    fullName: string | null;
    role: UserRole;
    organizationId: string | null;
    isSuperAdmin: boolean;
  } | null;
  onSuccess: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  organizations,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState<UserRole>("VIEWER");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const isEdit = !!user;

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email ?? "");
    setPassword("");
    setFullName(user?.fullName ?? "");
    setOrganizationId(user?.organizationId ?? "");
    setRole(user?.role ?? "VIEWER");
    setIsSuperAdmin(user?.isSuperAdmin ?? false);
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = isEdit
        ? {
            fullName,
            organizationId: isSuperAdmin ? null : organizationId || null,
            role,
            isSuperAdmin,
            ...(password ? { password } : {}),
          }
        : {
            email,
            password,
            fullName,
            organizationId: isSuperAdmin ? null : organizationId,
            role,
            isSuperAdmin,
          };

      const res = await fetch(
        isEdit ? `/api/platform/users/${user.userId}` : "/api/platform/users",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      toast({ title: isEdit ? "User updated" : "User created" });
      onSuccess();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update role, organization, or platform access."
              : "Create a library user or platform super admin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {!isEdit ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
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
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              id="isSuperAdmin"
              checked={isSuperAdmin}
              onCheckedChange={(checked) => setIsSuperAdmin(checked === true)}
            />
            <Label htmlFor="isSuperAdmin" className="cursor-pointer">
              Super admin (full platform access)
            </Label>
          </div>

          {!isSuperAdmin ? (
            <>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={organizationId}
                  onValueChange={setOrganizationId}
                  required={!isSuperAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select library" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          {isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password (optional)</Label>
              <Input
                id="newPassword"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create user"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
