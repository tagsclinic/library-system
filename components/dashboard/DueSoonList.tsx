"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { differenceInDays } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/brand";
import type { LoanStatus } from "@/types";

interface OverdueLoan {
  id: string;
  dueDate: string;
  status: LoanStatus;
  book: { id: string; title: string; author: string };
  borrower: { id: string; fullName: string };
}

interface DueSoonListProps {
  loans: OverdueLoan[];
}

export function DueSoonList({ loans = [] }: DueSoonListProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Overdue Books</CardTitle>
        <p className="text-sm text-muted-foreground">
          Titles past their due date
        </p>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No overdue books — great job!
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {loans.map((loan) => {
              const daysOverdue = Math.max(
                1,
                differenceInDays(new Date(), new Date(loan.dueDate))
              );

              return (
                <li key={loan.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/books/${loan.book.id}`}
                      className="block truncate font-medium hover:text-[#2563EB] hover:underline"
                    >
                      {loan.book.title}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {loan.book.author}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {loan.borrower.fullName}
                    </p>
                  </div>
                  <Badge
                    className="shrink-0 border-0 font-medium"
                    style={{
                      backgroundColor: `${BRAND.dangerColor}15`,
                      color: BRAND.dangerColor,
                    }}
                  >
                    {daysOverdue}d overdue
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
