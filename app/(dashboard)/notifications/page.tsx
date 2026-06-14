"use client";

import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
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
import { NotificationStatus, NotificationType } from "@/types";

interface NotificationRow {
  id: string;
  type: NotificationType;
  channel: string;
  recipient: string;
  subject: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/notifications?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load notifications");
      setNotifications(json.data ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to load notifications",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const statusVariant = (status: NotificationStatus) => {
    switch (status) {
      case NotificationStatus.SENT:
        return "default";
      case NotificationStatus.FAILED:
        return "destructive";
      case NotificationStatus.NOT_CONFIGURED:
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Email and SMS notification log"
      />

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.values(NotificationStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No notifications found
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{n.channel}</TableCell>
                    <TableCell>{n.recipient}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {n.subject ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(n.status)}>
                        {n.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(n.sentAt ?? n.createdAt)}
                    </TableCell>
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
