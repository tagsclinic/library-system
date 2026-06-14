import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28 lg:pt-36 lg:pb-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-white" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.18),transparent)]" />
      <div className="absolute right-0 top-24 -z-10 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="absolute left-0 top-48 -z-10 h-64 w-64 rounded-full bg-indigo-100/40 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-[#2563EB]">
            {BRAND.tagline}
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            {BRAND.heroHeadline}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            {BRAND.heroSubheadline}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 min-w-[200px] bg-[#2563EB] px-8 text-base shadow-md hover:bg-[#1E40AF]"
              asChild
            >
              <Link href="/login">
                Start Free Trial
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 min-w-[200px] border-slate-300 bg-white/80 px-8 text-base text-slate-700 hover:bg-slate-50"
              asChild
            >
              <a href="mailto:hello@libraryinventory.com">
                <PlayCircle className="mr-1 h-4 w-4" />
                Request Demo
              </a>
            </Button>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl shadow-blue-500/10 ring-1 ring-slate-900/5">
            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-medium text-slate-400">
                  {BRAND.name} Dashboard
                </span>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {[
                  { label: "Books in catalog", value: "4,280" },
                  { label: "Active loans", value: "312" },
                  { label: "Due this week", value: "48" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
