"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { ProfilePhotoUpload } from "@/components/borrowers/ProfilePhotoUpload";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { borrowerSchema, type BorrowerInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { BorrowerStatus, LoanStatus } from "@/types";

interface BorrowerDetail extends BorrowerInput {
  id: string;
  createdAt: string;
  riskScore?: number;
  loans?: Array<{
    id: string;
    status: LoanStatus;
    checkoutDate: string;
    dueDate: string;
    book: { title: string };
  }>;
}

export default function EditBorrowerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [borrower, setBorrower] = useState<BorrowerDetail | null>(null);

  const form = useForm<BorrowerInput>({
    resolver: zodResolver(borrowerSchema),
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/borrowers/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load borrower");
        const data = json.data;
        setBorrower({
          ...data,
          riskScore: data.riskProfile?.riskScore,
        });
        form.reset({
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
          photoUrl: data.photoUrl,
          status: data.status,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to load borrower",
        });
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [params.id, form, toast]);

  async function onSubmit(values: BorrowerInput) {
    setLoading(true);
    try {
      const res = await fetch(`/api/borrowers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update borrower");

      toast({
        title: "Borrower updated",
        description: "Changes saved successfully.",
      });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update borrower",
      });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <LoadingSpinner className="py-12" />;
  if (!borrower) return <p className="text-muted-foreground">Borrower not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={borrower.fullName}
        description={`Member since ${formatDate(borrower.createdAt)}`}
        action={
          borrower.riskScore !== undefined ? (
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Risk Score</p>
              <p className="text-2xl font-bold">{borrower.riskScore}</p>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Borrower Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ProfilePhotoUpload
                          value={field.value}
                          onChange={field.onChange}
                          onError={(message) =>
                            toast({
                              variant: "destructive",
                              title: "Photo upload failed",
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
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <PhoneInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
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
                          {Object.values(BorrowerStatus).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
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
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Back
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Loan History</CardTitle>
            <StatusBadge status={borrower.status as BorrowerStatus} />
          </CardHeader>
          <CardContent>
            {!borrower.loans?.length ? (
              <p className="text-sm text-muted-foreground">No loan history.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Checkout</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {borrower.loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.book.title}</TableCell>
                      <TableCell>{formatDate(loan.checkoutDate)}</TableCell>
                      <TableCell>{formatDate(loan.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={loan.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
