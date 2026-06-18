"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/brand";
import { renewalSchema, type RenewalInput } from "@/lib/validations";
import { calculateDueDate, cn, formatDate } from "@/lib/utils";
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
  book: { title: string; author: string; barcodeValue?: string | null };
  borrower: { fullName: string; phone?: string | null };
  _count?: { renewals: number };
}

const RENEWALS_PAGE_SIZE = 50;

function isOverdue(loan: ActiveLoan): boolean {
  return (
    loan.status === LoanStatus.OVERDUE ||
    (loan.status === LoanStatus.ACTIVE && new Date(loan.dueDate) < new Date())
  );
}

function DueBadge({ loan }: { loan: ActiveLoan }) {
  const days = differenceInCalendarDays(new Date(loan.dueDate), new Date());

  if (days < 0) {
    return (
      <Badge
        className="border-0 font-medium"
        style={{ backgroundColor: `${BRAND.dangerColor}15`, color: BRAND.dangerColor }}
      >
        {Math.abs(days)}d overdue
      </Badge>
    );
  }

  if (days <= 3) {
    return (
      <Badge
        className="border-0 font-medium"
        style={{ backgroundColor: `${BRAND.warningColor}15`, color: BRAND.warningColor }}
      >
        Due in {days}d
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="font-medium">
      Due {formatDate(loan.dueDate)}
    </Badge>
  );
}

export default function RenewalsPage() {
  const { toast } = useToast();
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);
  const [renewalTotal, setRenewalTotal] = useState(0);
  const [renewalLimit, setRenewalLimit] = useState(RENEWALS_PAGE_SIZE);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [maxRenewals, setMaxRenewals] = useState(2);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loanQuery, setLoanQuery] = useState("");
  const [loanFilter, setLoanFilter] = useState<"all" | "overdue">("all");
  const [renewalQuery, setRenewalQuery] = useState("");

  const form = useForm<RenewalInput>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      loanId: "",
      loanPeriodType: LoanPeriodType.TWO_WEEKS,
      customDays: null,
      reason: "",
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [renewalsRes, loansRes, settingsRes] = await Promise.all([
        fetch(`/api/renewals?limit=${renewalLimit}`),
        fetch("/api/loans?active=true&limit=200"),
        fetch("/api/settings"),
      ]);

      const renewalsJson = await renewalsRes.json();
      const loansJson = await loansRes.json();
      const settingsJson = await settingsRes.json();

      if (!renewalsRes.ok) throw new Error(renewalsJson.error ?? "Failed to load renewals");
      if (!loansRes.ok) throw new Error(loansJson.error ?? "Failed to load loans");

      setRenewals(renewalsJson.data ?? []);
      setRenewalTotal(renewalsJson.total ?? 0);
      setActiveLoans(loansJson.data ?? []);

      if (settingsRes.ok) {
        const parsedMax = parseInt(settingsJson.settings?.max_renewals ?? "", 10);
        setMaxRenewals(Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 2);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load data",
      });
    } finally {
      setLoading(false);
    }
  }, [renewalLimit, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLoans = useMemo(() => {
    const q = loanQuery.trim().toLowerCase();
    return activeLoans.filter((loan) => {
      if (loanFilter === "overdue" && !isOverdue(loan)) return false;
      if (!q) return true;
      return (
        loan.book.title.toLowerCase().includes(q) ||
        loan.book.author.toLowerCase().includes(q) ||
        loan.book.barcodeValue?.toLowerCase().includes(q) ||
        loan.borrower.fullName.toLowerCase().includes(q) ||
        loan.borrower.phone?.toLowerCase().includes(q)
      );
    });
  }, [activeLoans, loanQuery, loanFilter]);

  const filteredRenewals = useMemo(() => {
    const q = renewalQuery.trim().toLowerCase();
    if (!q) return renewals;
    return renewals.filter(
      (r) =>
        r.loan.book.title.toLowerCase().includes(q) ||
        r.loan.book.author.toLowerCase().includes(q) ||
        r.loan.borrower.fullName.toLowerCase().includes(q)
    );
  }, [renewals, renewalQuery]);

  const overdueCount = useMemo(() => activeLoans.filter(isOverdue).length, [activeLoans]);
  const renewalsThisMonth = useMemo(() => {
    const now = new Date();
    return renewals.filter((r) => {
      const created = new Date(r.createdAt);
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [renewals]);

  const selectedLoanId = form.watch("loanId");
  const watchedPeriod = form.watch("loanPeriodType");
  const watchedCustomDays = form.watch("customDays");
  const selectedLoan = activeLoans.find((loan) => loan.id === selectedLoanId);
  const selectedRenewalCount = selectedLoan?._count?.renewals ?? 0;
  const selectedAtMax = selectedRenewalCount >= maxRenewals;

  const previewDueDate =
    selectedLoan &&
    (watchedPeriod !== LoanPeriodType.CUSTOM || (watchedCustomDays && watchedCustomDays > 0))
      ? calculateDueDate(new Date(selectedLoan.dueDate), watchedPeriod, watchedCustomDays)
      : null;

  function selectLoan(loan: ActiveLoan) {
    if ((loan._count?.renewals ?? 0) >= maxRenewals) return;
    form.setValue("loanId", loan.id, { shouldValidate: true });
  }

  function clearSelection() {
    form.setValue("loanId", "", { shouldValidate: false });
  }

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
        customDays: null,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals"
        description="Review renewal history and process new renewal requests"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <RefreshCw className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{activeLoans.length}</p>
              <p className="text-sm text-muted-foreground">Eligible for renewal</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{overdueCount}</p>
              <p className="text-sm text-muted-foreground">Currently overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{renewalsThisMonth}</p>
              <p className="text-sm text-muted-foreground">Renewals this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Find a Loan to Renew</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by borrower, book title, or barcode..."
                    value={loanQuery}
                    onChange={(e) => setLoanQuery(e.target.value)}
                  />
                </div>
                <Select value={loanFilter} onValueChange={(v) => setLoanFilter(v as "all" | "overdue")}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All eligible</SelectItem>
                    <SelectItem value="overdue">Overdue only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-2">
                {filteredLoans.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No matching loans found.
                  </p>
                ) : (
                  filteredLoans.map((loan) => {
                    const atMax = (loan._count?.renewals ?? 0) >= maxRenewals;
                    return (
                      <button
                        key={loan.id}
                        type="button"
                        disabled={atMax}
                        onClick={() => selectLoan(loan)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                          selectedLoanId === loan.id
                            ? "border-primary bg-primary/5"
                            : atMax
                              ? "cursor-not-allowed opacity-60"
                              : "hover:bg-muted"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{loan.book.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {loan.book.author}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {loan.borrower.fullName}
                            {loan.borrower.phone ? ` · ${loan.borrower.phone}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <DueBadge loan={loan} />
                          <span className="text-xs text-muted-foreground">
                            {atMax
                              ? "Max renewals reached"
                              : `${loan._count?.renewals ?? 0}/${maxRenewals} renewals used`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {selectedLoan ? (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {selectedLoan.book.title} — {selectedLoan.borrower.fullName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Current due date: {formatDate(selectedLoan.dueDate)} ·{" "}
                            {selectedRenewalCount}/{maxRenewals} renewals used
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                          <X className="mr-1 h-4 w-4" />
                          Change
                        </Button>
                      </div>

                      {selectedAtMax ? (
                        <p className="flex items-center gap-2 text-sm font-medium text-[#EF4444]">
                          <AlertTriangle className="h-4 w-4" />
                          This loan has reached the maximum number of renewals.
                        </p>
                      ) : (
                        <>
                          <FormField
                            control={form.control}
                            name="loanPeriodType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Extension Period</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue(
                                      "customDays",
                                      value === LoanPeriodType.CUSTOM ? undefined : null
                                    );
                                  }}
                                  value={field.value}
                                >
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

                          {watchedPeriod === LoanPeriodType.CUSTOM && (
                            <FormField
                              control={form.control}
                              name="customDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Number of Days</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={365}
                                      placeholder="e.g. 7"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        field.onChange(raw ? Number(raw) : undefined);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarClock className="h-4 w-4" />
                            New due date:{" "}
                            <span className="font-medium text-foreground">
                              {previewDueDate ? formatDate(previewDueDate) : "—"}
                            </span>
                          </p>

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

                          <Button type="submit" disabled={submitting} className="w-full">
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
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">
                      Select a loan above to process its renewal.
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Renewals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by borrower or book title..."
                  value={renewalQuery}
                  onChange={(e) => setRenewalQuery(e.target.value)}
                />
              </div>

              {filteredRenewals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No renewals found.
                </p>
              ) : (
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead>New Due</TableHead>
                        <TableHead>Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRenewals.map((renewal) => (
                        <TableRow key={renewal.id}>
                          <TableCell>
                            <div className="font-medium">{renewal.loan.book.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {renewal.loan.book.author}
                            </div>
                            {renewal.reason ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                &ldquo;{renewal.reason}&rdquo;
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{renewal.loan.borrower.fullName}</TableCell>
                          <TableCell>
                            <div>{formatDate(renewal.newDueDate)}</div>
                            <div className="text-xs text-muted-foreground">
                              was {formatDate(renewal.oldDueDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {renewal.approvedBy ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!renewalQuery && renewals.length < renewalTotal ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setRenewalLimit((l) => l + RENEWALS_PAGE_SIZE)}
                >
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Load more
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
