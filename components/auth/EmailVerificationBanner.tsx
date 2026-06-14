"use client";

import { Mail } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EmailVerificationBannerProps {
  email: string;
  organizationName?: string;
}

export function EmailVerificationBanner({
  email,
  organizationName,
}: EmailVerificationBannerProps) {
  return (
    <Card className="w-full max-w-md border-emerald-200 bg-emerald-50/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Mail className="h-6 w-6 text-emerald-600" />
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription className="text-base">
          {organizationName
            ? `${organizationName} is almost ready.`
            : "Your workspace is almost ready."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a verification link to:
        </p>
        <p className="rounded-lg border bg-white px-4 py-2 text-sm font-medium">
          {email}
        </p>
        <p className="text-xs text-muted-foreground">
          Click the link in your email to verify your account, then sign in to
          access your dashboard.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
