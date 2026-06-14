"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export interface RecentCheckout {
  id: string;
  checkoutDate: string;
  dueDate: string;
  book: { id: string; title: string };
  borrower: { id: string; fullName: string };
}

interface RecentCheckoutsProps {
  checkouts: RecentCheckout[];
}

export function RecentCheckouts({ checkouts }: RecentCheckoutsProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Checkouts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest books checked out to borrowers
        </p>
      </CardHeader>
      <CardContent>
        {checkouts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recent checkouts.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Book</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Date Out</TableHead>
                <TableHead className="text-right">Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkouts.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/books/${loan.book.id}`}
                      className="hover:text-[#2563EB] hover:underline"
                    >
                      {loan.book.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/borrowers/${loan.borrower.id}/edit`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {loan.borrower.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(loan.checkoutDate)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(loan.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
