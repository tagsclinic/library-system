"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { CoverImageUpload } from "@/components/books/CoverImageUpload";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/fetch-api";
import { bookCreateSchema, type BookCreateInput } from "@/lib/validations";
import { BookCondition, BookStatus } from "@/types";

interface BorrowerOption {
  id: string;
  fullName: string;
  email?: string | null;
}

export default function NewBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);

  const form = useForm<BookCreateInput>({
    resolver: zodResolver(bookCreateSchema),
    defaultValues: {
      title: "",
      author: "",
      category: "",
      isbn: "",
      coverImageUrl: "",
      replacementValue: undefined,
      currentCondition: BookCondition.GOOD,
      status: BookStatus.AVAILABLE,
      notes: "",
      publishedYear: undefined,
      publisher: "",
      edition: "",
      quantity: 1,
      notifyMode: "NONE",
      notifyMessage: "",
      selectedBorrowerIds: [],
    },
  });

  const notifyMode = form.watch("notifyMode");

  useEffect(() => {
    if (notifyMode !== "SELECTED") return;
    fetchApi<{ data: BorrowerOption[] }>("/api/borrowers?status=ACTIVE&limit=100")
      .then((result) => setBorrowers(result.data ?? []))
      .catch(() => setBorrowers([]));
  }, [notifyMode]);

  async function onSubmit(values: BookCreateInput) {
    setLoading(true);
    try {
      const result = await fetchApi<{
        data: { book?: { id: string }; copiesCreated?: number; announcement?: { sent: number } };
      }>("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const copiesCreated = result.data?.copiesCreated ?? 1;
      const sent = result.data?.announcement?.sent ?? 0;

      toast({
        title: copiesCreated > 1 ? `${copiesCreated} copies created` : "Book created",
        description:
          sent > 0
            ? `"${values.title}" added and emailed to ${sent} borrower(s).`
            : `"${values.title}" added to catalog.`,
      });
      router.push(`/books/${result.data?.book?.id ?? ""}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create book",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Book" description="Add a new book to the catalog" />
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISBN</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publishedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Published Year</FormLabel>
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
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="edition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edition</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="replacementValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Replacement Value ($)</FormLabel>
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
                <FormField
                  control={form.control}
                  name="currentCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(BookStatus).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
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
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of copies</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          {...field}
                          value={field.value ?? 1}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : 1
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover photo</FormLabel>
                    <FormControl>
                      <CoverImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        onError={(message) =>
                          toast({
                            variant: "destructive",
                            title: "Cover upload failed",
                            description: message,
                          })
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
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

              <div className="space-y-4 rounded-lg border border-dashed p-4">
                <div>
                  <p className="font-medium">Notify Borrowers</p>
                  <p className="text-sm text-muted-foreground">
                    Optionally email borrowers when this book is added.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="notifyMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email notification</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "NONE"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">Do not send</SelectItem>
                          <SelectItem value="ALL">Send to all active borrowers</SelectItem>
                          <SelectItem value="SELECTED">Send to selected borrowers</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {notifyMode !== "NONE" ? (
                  <FormField
                    control={form.control}
                    name="notifyMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Library message (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder="A new book is now available at our library."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                {notifyMode === "SELECTED" ? (
                  <FormField
                    control={form.control}
                    name="selectedBorrowerIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select borrowers with email</FormLabel>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                          {borrowers.filter((b) => b.email).map((borrower) => {
                            const checked = field.value?.includes(borrower.id) ?? false;
                            return (
                              <label
                                key={borrower.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const current = field.value ?? [];
                                    field.onChange(
                                      value
                                        ? [...current, borrower.id]
                                        : current.filter((id) => id !== borrower.id)
                                    );
                                  }}
                                />
                                {borrower.fullName} ({borrower.email})
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Book
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
