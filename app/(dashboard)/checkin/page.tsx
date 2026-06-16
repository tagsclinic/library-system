"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";

import { BarcodeScannerInput } from "@/components/shared/BarcodeScannerInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";
import { checkinSchema, type CheckinInput } from "@/lib/validations";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BookCondition, LoanStatus, PaymentStatus } from "@/types";

interface ActiveLoan {
  id: string;
  status: LoanStatus;
  checkoutDate: string;
  dueDate: string;
  checkoutCondition: BookCondition;
  checkoutNotes: string | null;
  book: {
    id: string;
    title: string;
    author: string;
    barcodeValue: string;
    isbn?: string | null;
    replacementValue: string | null;
  };
  borrower: { fullName: string; phone: string };
}

export default function CheckinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loan, setLoan] = useState<ActiveLoan | null>(null);
  const [results, setResults] = useState<ActiveLoan[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CheckinInput>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      loanId: "",
      returnCondition: BookCondition.GOOD,
      returnNotes: "",
      repairCost: null,
      amountOwed: null,
      paymentStatus: PaymentStatus.PENDING,
      markAsLost: false,
      markAsDamaged: false,
    },
  });

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  function selectLoan(active: ActiveLoan) {
    setLoan(active);
    setResults([]);
    form.reset({
      loanId: active.id,
      returnCondition: active.checkoutCondition,
      returnNotes: "",
      repairCost: null,
      amountOwed: null,
      paymentStatus: PaymentStatus.PENDING,
      markAsLost: false,
      markAsDamaged: false,
    });
  }

  async function findLoan(searchValue?: string) {
    const value = (searchValue ?? query).trim();
    if (!value) return;

    setSearching(true);
    setLoan(null);
    setResults([]);

    try {
      const looksLikeBarcode = /^[A-Z0-9\-]+$/i.test(value) && value.length >= 4;

      if (looksLikeBarcode) {
        try {
          const exact = await fetchApi<{ data: ActiveLoan }>(
            `/api/loans/lookup?barcode=${encodeURIComponent(value)}`
          );
          selectLoan(exact.data);
          return;
        } catch {
          // fall through to broad search
        }
      }

      const search = await fetchApi<{ data: ActiveLoan[] }>(
        `/api/loans/lookup?q=${encodeURIComponent(value)}`
      );
      const loans = search.data ?? [];

      if (loans.length === 0) {
        throw new Error("No active loan found. Try barcode, title, borrower, or ISBN.");
      }

      if (loans.length === 1) {
        selectLoan(loans[0]);
        return;
      }

      setResults(loans);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Not found",
        description: err instanceof Error ? err.message : "Search failed",
      });
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(values: CheckinInput) {
    setSubmitting(true);
    try {
      await fetchApi(`/api/loans/${values.loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      toast({
        title: "Check-in complete",
        description: `"${loan?.book.title}" returned successfully.`,
      });
      router.push("/dashboard");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: err instanceof Error ? err.message : "Check-in failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const returnCondition = form.watch("returnCondition");
  const conditionChanged = loan && returnCondition !== loan.checkoutCondition;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-In"
        description="Scan or search to return a book quickly"
      />

      <Card>
        <CardHeader>
          <CardTitle>Find Active Loan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BarcodeScannerInput
            value={query}
            onChange={setQuery}
            onScan={findLoan}
            disabled={searching}
            placeholder="Scan barcode, or search title, borrower, ISBN..."
          />
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                className="pl-9"
                placeholder="Search by book title or borrower name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && findLoan()}
              />
            </div>
            <Button onClick={() => findLoan()} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Tip: USB barcode scanners work automatically in the scan field above.
          </p>
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Loan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectLoan(item)}
                className="flex w-full items-start justify-between rounded-md border p-3 text-left hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{item.book.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.borrower.fullName} · {item.book.barcodeValue}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {loan && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Book:</strong> {loan.book.title} by {loan.book.author}
              </p>
              <p>
                <strong>Barcode:</strong> {loan.book.barcodeValue}
              </p>
              <p>
                <strong>Borrower:</strong> {loan.borrower.fullName}
              </p>
              <p>
                <strong>Checkout:</strong> {formatDate(loan.checkoutDate)}
              </p>
              <p>
                <strong>Due:</strong> {formatDate(loan.dueDate)}
              </p>
              <p className="flex items-center gap-2">
                <strong>Status:</strong> <StatusBadge status={loan.status} />
              </p>
              <p>
                <strong>Checkout Condition:</strong> {loan.checkoutCondition}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Return Processing</CardTitle>
            </CardHeader>
            <CardContent>
              {conditionChanged && (
                <Alert className="mb-4">
                  <AlertTitle>Condition Changed</AlertTitle>
                  <AlertDescription>
                    Checkout: {loan.checkoutCondition} → Return: {returnCondition}
                  </AlertDescription>
                </Alert>
              )}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="returnCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Condition</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(BookCondition).map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
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
                    name="returnNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="markAsDamaged"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Mark as Damaged</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="markAsLost"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked && loan.book.replacementValue) {
                                  form.setValue(
                                    "amountOwed",
                                    Number(loan.book.replacementValue)
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">
                            Mark as Lost ({formatCurrency(loan.book.replacementValue)})
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.watch("markAsDamaged") && (
                    <FormField
                      control={form.control}
                      name="repairCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repair Cost ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Complete Check-In
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
