"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
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
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { formatDate, calculateDueDate } from "@/lib/utils";
import { BookCondition, LoanPeriodType } from "@/types";

const STEPS = ["Borrower", "Book", "Loan Period", "Review & T&C"];

interface BorrowerOption {
  id: string;
  fullName: string;
  status: string;
}

interface BookOption {
  id: string;
  title: string;
  author: string;
  currentCondition: BookCondition;
  barcodeValue: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [fetching, setFetching] = useState(true);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      borrowerId: "",
      bookId: "",
      loanPeriodType: LoanPeriodType.TWO_WEEKS,
      customDays: null,
      checkoutCondition: BookCondition.GOOD,
      checkoutNotes: "",
      termsAccepted: undefined as unknown as true,
      termsVersion: "1.0",
    },
  });

  const watched = form.watch();

  useEffect(() => {
    async function load() {
      try {
        const [borrowersRes, booksRes] = await Promise.all([
          fetch("/api/borrowers?status=ACTIVE"),
          fetch("/api/books?status=AVAILABLE"),
        ]);
        const borrowersJson = await borrowersRes.json();
        const booksJson = await booksRes.json();
        setBorrowers(borrowersJson.data ?? []);
        setBooks(booksJson.data ?? []);
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load checkout data",
        });
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [toast]);

  const selectedBorrower = borrowers.find((b) => b.id === watched.borrowerId);
  const selectedBook = books.find((b) => b.id === watched.bookId);
  const dueDate = calculateDueDate(
    new Date(),
    watched.loanPeriodType,
    watched.customDays
  );

  async function onSubmit(values: CheckoutInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed");

      toast({
        title: "Checkout complete",
        description: `Book checked out to ${selectedBorrower?.fullName}.`,
      });
      router.push("/dashboard");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: err instanceof Error ? err.message : "Checkout failed",
      });
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    const fields: (keyof CheckoutInput)[] =
      step === 0
        ? ["borrowerId"]
        : step === 1
          ? ["bookId", "checkoutCondition"]
          : step === 2
            ? ["loanPeriodType", "customDays"]
            : ["termsAccepted"];

    form.trigger(fields).then((valid) => {
      if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    });
  }

  if (fetching) return <LoadingSpinner className="py-12" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checkout"
        description="Check out a book to a borrower"
      />

      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "border-2 border-primary text-primary"
                    : "border text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="hidden text-sm sm:inline">{label}</span>
            {i < STEPS.length - 1 && (
              <div className="hidden h-px w-8 bg-border sm:block" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step {step + 1}: {STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {step === 0 && (
                <FormField
                  control={form.control}
                  name="borrowerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Borrower</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a borrower" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {borrowers.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="bookId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Book</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const book = books.find((b) => b.id === val);
                            if (book) {
                              form.setValue(
                                "checkoutCondition",
                                book.currentCondition
                              );
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a book" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {books.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.title} — {b.author}
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
                    name="checkoutCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Checkout Condition</FormLabel>
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
                    name="checkoutNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="loanPeriodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Period</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(LoanPeriodType).map((p) => (
                              <SelectItem key={p} value={p}>
                                {p.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Due date: {formatDate(dueDate)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watched.loanPeriodType === LoanPeriodType.CUSTOM && (
                    <FormField
                      control={form.control}
                      name="customDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                </>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <p>
                      <strong>Borrower:</strong> {selectedBorrower?.fullName}
                    </p>
                    <p>
                      <strong>Book:</strong> {selectedBook?.title} by{" "}
                      {selectedBook?.author}
                    </p>
                    <p>
                      <strong>Condition:</strong> {watched.checkoutCondition}
                    </p>
                    <p>
                      <strong>Due Date:</strong> {formatDate(dueDate)}
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true ? true : undefined)
                            }
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I accept the library terms and conditions (v1.0)
                          </FormLabel>
                          <FormDescription>
                            Borrower agrees to return the book by the due date
                            and pay fees for damage or loss.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => Math.max(s - 1, 0))}
                  disabled={step === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Complete Checkout
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
