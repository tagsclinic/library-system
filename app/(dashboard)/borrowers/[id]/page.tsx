"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreditCard, Pencil } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { riskLevelColor } from "@/lib/risk";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BorrowerStatus,
  LoanStatus,
  PaymentStatus,
  type BorrowerRiskProfile,
  type RiskLevel,
} from "@/types";

interface BorrowerLoan {
  id: string;
  status: LoanStatus;
  checkoutDate: string;
  dueDate: string;
  returnDate: string | null;
  amountOwed: number | null;
  repairCost: number | null;
  paymentStatus: PaymentStatus | null;
  book: { id: string; title: string; author: string };
}

interface BorrowerProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: BorrowerStatus;
  createdAt: string;
  loans: BorrowerLoan[];
  riskProfile: BorrowerRiskProfile;
}

function RiskBadge({ level }: { level: RiskLevel | string }) {
  return (
    <Badge className={riskLevelColor(level as RiskLevel)}>
      {String(level).replace(/_/g, " ")} RISK
    </Badge>
  );
}

export default function BorrowerProfilePage() {
  const params = useParams();
  const { toast } = useToast();
  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/borrowers/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load borrower");
        setBorrower(json.data);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to load borrower",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, toast]);

  if (loading) return <LoadingSpinner className="py-12" />;
  if (!borrower) return <p className="text-muted-foreground">Borrower not found.</p>;

  const activeLoans = borrower.loans.filter(
    (loan) =>
      loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE
  );
  const financialLoans = borrower.loans.filter(
    (loan) =>
      loan.amountOwed != null &&
      loan.amountOwed > 0 &&
      loan.paymentStatus !== PaymentStatus.PAID
  );
  const totalOwed = financialLoans.reduce(
    (sum, loan) => sum + (loan.amountOwed ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={borrower.fullName}
        description={borrower.email ?? borrower.phone}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/borrowers/${borrower.id}/card`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Library Card
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/borrowers/${borrower.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={borrower.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{borrower.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{borrower.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{formatDate(borrower.createdAt)}</span>
            </div>
            {borrower.address ? (
              <div>
                <span className="text-muted-foreground">Address</span>
                <p className="mt-1">{borrower.address}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk level</span>
              {borrower.riskProfile.riskLevel ? (
                <RiskBadge level={borrower.riskProfile.riskLevel} />
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk score</span>
              <span className="font-medium">{borrower.riskProfile.riskScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overdue loans</span>
              <span>{borrower.riskProfile.overdueCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lost items</span>
              <span>{borrower.riskProfile.lostCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Damaged returns</span>
              <span>{borrower.riskProfile.damagedCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outstanding balance</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(totalOwed)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open charges</span>
              <span>{financialLoans.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Loans ({activeLoans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active loans.</p>
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
                {activeLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <Link
                        href={`/books/${loan.book.id}`}
                        className="font-medium hover:underline"
                      >
                        {loan.book.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {loan.book.author}
                      </div>
                    </TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle>Loan History</CardTitle>
        </CardHeader>
        <CardContent>
          {borrower.loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loan history.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Checkout</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount Owed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrower.loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.book.title}</TableCell>
                    <TableCell>{formatDate(loan.checkoutDate)}</TableCell>
                    <TableCell>
                      {loan.returnDate ? formatDate(loan.returnDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell>
                      {loan.amountOwed != null
                        ? formatCurrency(loan.amountOwed)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {financialLoans.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Financial Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Repair Cost</TableHead>
                  <TableHead>Amount Owed</TableHead>
                  <TableHead>Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.book.title}</TableCell>
                    <TableCell>
                      {loan.repairCost != null
                        ? formatCurrency(loan.repairCost)
                        : "—"}
                    </TableCell>
                    <TableCell>{formatCurrency(loan.amountOwed)}</TableCell>
                    <TableCell>
                      {loan.paymentStatus ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
