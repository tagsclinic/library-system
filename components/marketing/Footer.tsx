import Link from "next/link";
import { BookOpen } from "lucide-react";

import { BRAND } from "@/lib/brand";

const FOOTER_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "mailto:hello@libraryinventory.com" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <div className="text-center sm:text-left">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-white">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold text-slate-900">
                {BRAND.name}
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">{BRAND.footerText}</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-[#2563EB]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 text-center">
          <p className="text-sm text-slate-500">{BRAND.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
