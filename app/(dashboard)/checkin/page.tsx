"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";

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
import { checkinSchema, type CheckinInput } from "@/lib/validations";
import { formatApiError, formatDate, formatCurrency } from "@/lib/utils";
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
    replacementValue: string | null;
  };
  borrower: { fullName: string; phone: string };
}

export default function CheckinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loan, setLoan] = useState<ActiveLoan | null>(null);

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

  async function findLoan() {
    if (!barcode.trim()) return;
    setSearching(true);
    setLoan(null);
    try {
      const res = await fetch(
        `/api/loans/lookup?barcode=${encodeURIComponent(barcode.trim())}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(formatApiError(json.error) ?? "No active loan found");
      }

      const active = json.data as ActiveLoan;
      if (
        active.status !== LoanStatus.ACTIVE &&
        active.status !== LoanStatus.OVERDUE
      ) {
        throw new Error("This loan is not active and cannot be checked in.");
      }

      setLoan(active);
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
      const res = await fetch(`/api/loans/${values.loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(formatApiError(json.error) ?? "Check-in failed");

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
  const conditionChanged =
    loan && returnCondition !== loan.checkoutCondition;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-In"
        description="Return a book and record its condition"
      />

      <Card>
        <CardHeader>
          <CardTitle>Find Loan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Scan or enter book barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findLoan()}
            />
            <Button onClick={findLoan} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                            Mark as Lost (
                            {formatCurrency(loan.book.replacementValue)})
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
                              {...field}
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
