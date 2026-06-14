"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-lg"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            {BRAND.name}
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2563EB]"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2563EB]"
          >
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="text-slate-600" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button
            size="sm"
            className="bg-[#2563EB] hover:bg-[#1E40AF] shadow-sm"
            asChild
          >
            <Link href="/login">Start Free Trial</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
