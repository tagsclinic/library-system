"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, List, Loader2, Plus, Search } from "lucide-react";

import { ActiveCheckoutsDialog } from "@/components/checkout/ActiveCheckoutsDialog";
import { CheckoutReceiptPrint, type CheckoutReceiptData } from "@/components/checkout/CheckoutReceiptPrint";
import {
  QuickAddBorrowerDialog,
  type QuickAddedBorrower,
} from "@/components/checkout/QuickAddBorrowerDialog";
import { TermsAgreementPanel } from "@/components/checkout/TermsAgreementPanel";
import { BarcodeScannerInput } from "@/components/shared/BarcodeScannerInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { fetchApi } from "@/lib/fetch-api";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { TERMS_VERSION } from "@/lib/terms";
import { calculateDueDate, formatDate } from "@/lib/utils";
import { BookCondition, LoanPeriodType } from "@/types";

const STEPS = ["Borrower", "Book", "Loan Period", "Review & T&C"];
const BORROWER_REQUIRED_MESSAGE =
  "Please select or create a borrower before checking out a book.";

interface BorrowerOption {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  status: string;
}

interface BookOption {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  currentCondition: BookCondition;
  barcodeValue: string;
  copyNumber?: number | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [libraryName, setLibraryName] = useState("Library");
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [borrowerScan, setBorrowerScan] = useState("");
  const [scanningBorrower, setScanningBorrower] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [bookScan, setBookScan] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<BookOption[]>([]);
  const [scanningBook, setScanningBook] = useState(false);
  const [searchingBook, setSearchingBook] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceiptData | null>(null);
  const [activeCheckoutsOpen, setActiveCheckoutsOpen] = useState(false);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      borrowerId: undefined,
      bookId: undefined,
      loanPeriodType: LoanPeriodType.TWO_WEEKS,
      customDays: null,
      checkoutCondition: BookCondition.GOOD,
      checkoutNotes: "",
      termsAccepted: undefined,
      termsVersion: TERMS_VERSION,
    },
  });

  const watched = form.watch();

  async function refreshCheckoutData() {
    try {
      const [borrowersData, booksData] = await Promise.all([
        fetchApi<{ data: BorrowerOption[] }>("/api/borrowers?status=ACTIVE&limit=100"),
        fetchApi<{ data: BookOption[] }>("/api/books?status=AVAILABLE&limit=100"),
      ]);
      setBorrowers(borrowersData.data ?? []);
      setBooks(booksData.data ?? []);
    } catch {
      // keep existing lists if refresh fails
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [borrowersData, booksData, settingsData] = await Promise.all([
          fetchApi<{ data: BorrowerOption[] }>("/api/borrowers?status=ACTIVE&limit=100"),
          fetchApi<{ data: BookOption[] }>("/api/books?status=AVAILABLE&limit=100"),
          fetchApi<{ organization?: { name?: string } }>("/api/settings"),
        ]);

        setBorrowers(borrowersData.data ?? []);
        setBooks(booksData.data ?? []);
        setLibraryName(settingsData.organization?.name ?? "Library");
        setLoadError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load checkout data";
        setLoadError(message);
        toast({ variant: "destructive", title: "Error", description: message });
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [toast]);

  const filteredBorrowers = useMemo(() => {
    const q = borrowerSearch.trim().toLowerCase();
    if (!q) return borrowers;
    return borrowers.filter(
      (borrower) =>
        borrower.fullName.toLowerCase().includes(q) ||
        borrower.phone?.toLowerCase().includes(q) ||
        borrower.email?.toLowerCase().includes(q) ||
        borrower.id.toLowerCase().includes(q)
    );
  }, [borrowers, borrowerSearch]);

  const selectedBorrower = borrowers.find((b) => b.id === watched.borrowerId);
  const selectedBook = books.find((b) => b.id === watched.bookId);

  const dueDate =
    watched.loanPeriodType === LoanPeriodType.CUSTOM &&
    (!watched.customDays || watched.customDays < 1)
      ? null
      : calculateDueDate(new Date(), watched.loanPeriodType, watched.customDays);

  function selectBorrower(borrower: BorrowerOption) {
    setBorrowers((current) => {
      if (current.some((item) => item.id === borrower.id)) return current;
      return [borrower, ...current];
    });
    form.setValue("borrowerId", borrower.id, { shouldValidate: true });
    setBorrowerSearch("");
    setBorrowerScan("");
    toast({
      title: "Borrower selected",
      description: `${borrower.fullName} ready for checkout.`,
    });
    if (step === 0) setStep(1);
  }

  async function lookupBorrowerByScan(code: string) {
    if (!code.trim()) return;
    setScanningBorrower(true);
    try {
      const result = await fetchApi<{ data: BorrowerOption }>(
        `/api/borrowers/lookup?code=${encodeURIComponent(code.trim())}`
      );
      selectBorrower(result.data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Borrower not found",
        description:
          err instanceof Error
            ? err.message
            : "No active borrower matches this library card.",
      });
    } finally {
      setScanningBorrower(false);
    }
  }

  function handleBorrowerCreated(borrower: QuickAddedBorrower) {
    selectBorrower(borrower);
  }

  function selectBook(book: BookOption) {
    setBooks((current) => {
      if (current.some((item) => item.id === book.id)) return current;
      return [book, ...current];
    });
    form.setValue("bookId", book.id, { shouldValidate: true });
    form.setValue("checkoutCondition", book.currentCondition);
    setBookScan(book.barcodeValue);
    setBookSearch(`${book.title} — ${book.author}`);
    setBookSearchResults([]);
    toast({
      title: "Book selected",
      description: `${book.title} ready for checkout.`,
    });
    if (step < 1) setStep(1);
  }

  async function lookupBookByScan(code: string) {
    if (!code.trim()) return;
    setScanningBook(true);
    setBookSearchResults([]);
    try {
      const result = await fetchApi<{ data: BookOption }>(
        `/api/books/lookup?barcode=${encodeURIComponent(code.trim())}`
      );
      selectBook(result.data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Book not found",
        description:
          err instanceof Error
            ? err.message
            : "No available book matches this barcode or ISBN.",
      });
    } finally {
      setScanningBook(false);
    }
  }

  async function searchBooksByText(query?: string) {
    const q = (query ?? bookSearch).trim();
    if (!q) return;

    setSearchingBook(true);
    setBookSearchResults([]);

    try {
      const localMatches = books.filter(
        (book) =>
          book.title.toLowerCase().includes(q.toLowerCase()) ||
          book.author.toLowerCase().includes(q.toLowerCase()) ||
          book.isbn?.toLowerCase().includes(q.toLowerCase()) ||
          book.barcodeValue.toLowerCase().includes(q.toLowerCase())
      );

      if (localMatches.length > 0) {
        setBookSearchResults(localMatches.slice(0, 10));
        if (localMatches.length === 1) {
          selectBook(localMatches[0]);
        }
        return;
      }

      const result = await fetchApi<{ data: BookOption[] }>(
        `/api/books?status=AVAILABLE&q=${encodeURIComponent(q)}&limit=10`
      );
      const matches = result.data ?? [];

      if (matches.length === 0) {
        toast({
          variant: "destructive",
          title: "No books found",
          description: `No available books match "${q}".`,
        });
        return;
      }

      setBookSearchResults(matches);
      if (matches.length === 1) {
        selectBook(matches[0]);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Search failed",
        description: err instanceof Error ? err.message : "Could not search books.",
      });
    } finally {
      setSearchingBook(false);
    }
  }

  async function onSubmit(values: CheckoutInput) {
    if (!values.borrowerId) {
      form.setError("borrowerId", { message: BORROWER_REQUIRED_MESSAGE });
      setStep(0);
      return;
    }

    if (!values.bookId) {
      form.setError("bookId", { message: "Please select a book" });
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...values,
        customDays:
          values.loanPeriodType === LoanPeriodType.CUSTOM
            ? values.customDays
            : null,
        checkoutNotes: values.checkoutNotes || null,
        termsVersion: values.termsVersion || TERMS_VERSION,
      };

      const result = await fetchApi<{ data: { id: string; dueDate: string; checkoutDate: string } }>(
        "/api/loans",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const loan = result.data;
      setReceipt({
        libraryName,
        borrowerName: selectedBorrower?.fullName ?? "Borrower",
        borrowerPhone: selectedBorrower?.phone,
        bookTitle: selectedBook?.title ?? "Book",
        bookAuthor: selectedBook?.author ?? "",
        barcode: selectedBook?.barcodeValue,
        isbn: selectedBook?.isbn,
        checkoutDate: loan.checkoutDate,
        dueDate: loan.dueDate,
        termsAccepted: true,
        termsVersion: values.termsVersion,
        loanId: loan.id,
      });

      toast({
        title: "Checkout complete",
        description: `Book checked out to ${selectedBorrower?.fullName}.`,
      });
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

  function onInvalid(errors: typeof form.formState.errors) {
    const messages = Object.values(errors)
      .map((error) => error?.message)
      .filter(Boolean) as string[];

    if (errors.borrowerId) setStep(0);
    else if (errors.bookId || errors.checkoutCondition) setStep(1);
    else if (errors.loanPeriodType || errors.customDays) setStep(2);
    else if (errors.termsAccepted) setStep(3);

    toast({
      variant: "destructive",
      title: "Cannot complete checkout",
      description:
        messages[0] ??
        "Please review all steps and make sure the agreement is accepted.",
    });
  }

  function nextStep() {
    if (step === 0 && !form.getValues("borrowerId")) {
      form.setError("borrowerId", { message: BORROWER_REQUIRED_MESSAGE });
      toast({
        variant: "destructive",
        title: "Borrower required",
        description: BORROWER_REQUIRED_MESSAGE,
      });
      return;
    }

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

  const canProceed = borrowers.length > 0 && books.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checkout"
        description="Check out a book to a borrower"
        action={
          <Button variant="outline" onClick={() => setActiveCheckoutsOpen(true)}>
            <List className="mr-2 h-4 w-4" />
            Active Checkouts
          </Button>
        }
      />

      {step === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Find borrower — scan or search</p>
                <p className="text-xs text-muted-foreground">
                  Scan their digital library card, or search by name, phone, email, or ID.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAddOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Borrower
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Scan library card
              </p>
              <BarcodeScannerInput
                value={borrowerScan}
                onChange={setBorrowerScan}
                onScan={lookupBorrowerByScan}
                disabled={scanningBorrower}
                placeholder="Scan library card QR code..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Search by name, phone, email, or ID
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search borrower..."
                  value={borrowerSearch}
                  onChange={(e) => setBorrowerSearch(e.target.value)}
                />
              </div>
            </div>

            {selectedBorrower ? (
              <div className="rounded-md border bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <strong>{selectedBorrower.fullName}</strong>
                {selectedBorrower.phone ? ` · ${selectedBorrower.phone}` : ""}
              </div>
            ) : null}

            {borrowerSearch.trim() ? (
              <div className="space-y-2 rounded-md border bg-background p-2">
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  {filteredBorrowers.length} found
                </p>
                {filteredBorrowers.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    No matching borrowers.
                  </p>
                ) : (
                  filteredBorrowers.slice(0, 8).map((borrower) => (
                    <button
                      key={borrower.id}
                      type="button"
                      onClick={() => selectBorrower(borrower)}
                      className="flex w-full items-start justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <div>
                        <p className="font-medium">{borrower.fullName}</p>
                        <p className="text-muted-foreground">
                          {borrower.phone}
                          {borrower.email ? ` · ${borrower.email}` : ""}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : null}

            {scanningBorrower ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up library card...
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-sm font-medium">Find book — scan or search</p>
              <p className="text-xs text-muted-foreground">
                Scan a barcode, or type a book title, author, or ISBN and select from results.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Barcode scan</p>
              <BarcodeScannerInput
                value={bookScan}
                onChange={setBookScan}
                onScan={lookupBookByScan}
                disabled={scanningBook || searchingBook}
                placeholder="Scan barcode or ISBN..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Search by title</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value);
                      setBookSearchResults([]);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && searchBooksByText()}
                    placeholder="Type book title, author, or ISBN..."
                    disabled={scanningBook || searchingBook}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => searchBooksByText()}
                  disabled={scanningBook || searchingBook || !bookSearch.trim()}
                >
                  {searchingBook ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>

            {selectedBook ? (
              <div className="rounded-md border bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <strong>{selectedBook.title}</strong> by {selectedBook.author}
                {selectedBook.copyNumber ? ` (Copy ${selectedBook.copyNumber})` : ""}
              </div>
            ) : null}

            {bookSearchResults.length > 1 ? (
              <div className="space-y-2 rounded-md border bg-background p-2">
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  Select a book ({bookSearchResults.length} found)
                </p>
                {bookSearchResults.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => selectBook(book)}
                    className="flex w-full items-start justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="text-muted-foreground">
                        {book.author}
                        {book.copyNumber ? ` · Copy ${book.copyNumber}` : ""}
                        {book.barcodeValue ? ` · ${book.barcodeValue}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {scanningBook ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up barcode...
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load checkout data</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError && !canProceed ? (
        <Alert>
          <AlertTitle>Checkout requires books and borrowers</AlertTitle>
          <AlertDescription className="space-y-2">
            {borrowers.length === 0 ? (
              <p>
                No active borrowers found.{" "}
                <Link href="/borrowers/new" className="font-medium underline">
                  Add a borrower
                </Link>{" "}
                first.
              </p>
            ) : null}
            {books.length === 0 ? (
              <p>
                No available books found.{" "}
                <Link href="/books/new" className="font-medium underline">
                  Add a book
                </Link>{" "}
                or check in a returned copy.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
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
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Step {step + 1}: {STEPS[step]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="space-y-6"
            >
              {step === 0 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="borrowerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Or choose from the full list</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          disabled={!canProceed}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a borrower" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredBorrowers.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                No matching borrowers
                              </SelectItem>
                            ) : (
                              filteredBorrowers.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.fullName}
                                  {b.phone ? ` · ${b.phone}` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                              form.setValue("checkoutCondition", book.currentCondition);
                              setBookScan(book.barcodeValue);
                            }
                          }}
                          value={field.value ?? ""}
                          disabled={!canProceed}
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
                                {b.copyNumber ? ` (Copy ${b.copyNumber})` : ""}
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
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value === LoanPeriodType.CUSTOM) {
                              form.setValue("customDays", undefined);
                            } else {
                              form.setValue("customDays", null);
                            }
                          }}
                          value={field.value}
                        >
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
                          Due date:{" "}
                          {dueDate
                            ? formatDate(dueDate)
                            : watched.loanPeriodType === LoanPeriodType.CUSTOM
                              ? "Enter number of days below"
                              : "—"}
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
                          <FormLabel>Number of Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              placeholder="e.g. 1 for one more day"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                field.onChange(raw ? Number(raw) : undefined);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter any positive number of days (1–365).
                          </FormDescription>
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
                      <strong>Borrower:</strong> {selectedBorrower?.fullName ?? "—"}
                    </p>
                    <p>
                      <strong>Book:</strong> {selectedBook?.title} by {selectedBook?.author}
                    </p>
                    <p>
                      <strong>Barcode:</strong> {selectedBook?.barcodeValue ?? "—"}
                    </p>
                    <p>
                      <strong>Condition:</strong> {watched.checkoutCondition}
                    </p>
                    <p>
                      <strong>Due Date:</strong>{" "}
                      {dueDate ? formatDate(dueDate) : "—"}
                    </p>
                  </div>

                  <TermsAgreementPanel libraryName={libraryName} />

                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Borrower accepts the Terms and Conditions of the Book Agreement
                          </FormLabel>
                          <FormDescription>
                            The borrower must agree before checkout can be completed.
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
                  <Button type="button" onClick={nextStep} disabled={!canProceed}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading || !canProceed}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Complete Checkout
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ActiveCheckoutsDialog
        open={activeCheckoutsOpen}
        onOpenChange={setActiveCheckoutsOpen}
        onChanged={refreshCheckoutData}
      />

      <QuickAddBorrowerDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={handleBorrowerCreated}
      />

      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout Successful</DialogTitle>
            <DialogDescription>
              Print the receipt for the borrower, then return to the dashboard.
            </DialogDescription>
          </DialogHeader>
          {receipt ? <CheckoutReceiptPrint data={receipt} /> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
