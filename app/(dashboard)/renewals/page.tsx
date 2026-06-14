"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { renewalSchema, type RenewalInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { LoanPeriodType, LoanStatus } from "@/types";

interface RenewalRow {
  id: string;
  oldDueDate: string;
  newDueDate: string;
  reason: string | null;
  approvedBy: string | null;
  createdAt: string;
  loan: {
    id: string;
    book: { title: string; author: string };
    borrower: { fullName: string };
  };
}

interface ActiveLoan {
  id: string;
  dueDate: string;
  status: LoanStatus;
  book: { title: string; author: string };
  borrower: { fullName: string };
  _count?: { renewals: number };
}

export default function RenewalsPage() {
  const { toast } = useToast();
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RenewalInput>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      loanId: "",
      loanPeriodType: LoanPeriodType.TWO_WEEKS,
      reason: "",
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [renewalsRes, loansRes] = await Promise.all([
        fetch("/api/renewals?limit=50"),
        fetch("/api/loans?limit=100"),
      ]);

      const renewalsJson = await renewalsRes.json();
      const loansJson = await loansRes.json();

      if (!renewalsRes.ok) {
        throw new Error(renewalsJson.error ?? "Failed to load renewals");
      }
      if (!loansRes.ok) {
        throw new Error(loansJson.error ?? "Failed to load loans");
      }

      setRenewals(renewalsJson.data ?? []);
      const loans: ActiveLoan[] = loansJson.data ?? [];
      setActiveLoans(
        loans.filter(
          (loan) =>
            loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE
        )
      );
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load data",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onSubmit(values: RenewalInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to process renewal");

      toast({
        title: "Renewal approved",
        description: "The loan due date has been extended.",
      });
      form.reset({
        loanId: "",
        loanPeriodType: LoanPeriodType.TWO_WEEKS,
        reason: "",
      });
      fetchData();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Renewal failed",
        description: err instanceof Error ? err.message : "Failed to process renewal",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLoanId = form.watch("loanId");
  const selectedLoan = activeLoans.find((loan) => loan.id === selectedLoanId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals"
        description="Review renewal history and process new renewal requests"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Process Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="loanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active Loan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a loan to renew" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeLoans.map((loan) => (
                            <SelectItem key={loan.id} value={loan.id}>
                              {loan.book.title} — {loan.borrower.fullName} (due{" "}
                              {formatDate(loan.dueDate)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedLoan ? (
                  <p className="text-sm text-muted-foreground">
                    Current due date: {formatDate(selectedLoan.dueDate)} · Renewals
                    used: {selectedLoan._count?.renewals ?? 0}
                  </p>
                ) : null}

                <FormField
                  control={form.control}
                  name="loanPeriodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extension Period</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(LoanPeriodType).map((period) => (
                            <SelectItem key={period} value={period}>
                              {period.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Borrower requested extension..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={submitting || !selectedLoanId}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Approve Renewal
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Renewals</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner className="py-8" />
            ) : renewals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No renewals yet.</p>
            ) : (
              <div className="overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>New Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewals.map((renewal) => (
                      <TableRow key={renewal.id}>
                        <TableCell>
                          <div className="font-medium">{renewal.loan.book.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {renewal.loan.book.author}
                          </div>
                        </TableCell>
                        <TableCell>{renewal.loan.borrower.fullName}</TableCell>
                        <TableCell>{formatDate(renewal.newDueDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
