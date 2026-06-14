import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  LogIn,
  LogOut,
  RefreshCw,
  ScanBarcode,
  Shield,
  Users,
} from "lucide-react";

import { FEATURES } from "@/lib/brand";

const FEATURE_ICONS = [
  BookOpen,
  LogOut,
  LogIn,
  Users,
  Calendar,
  RefreshCw,
  BarChart3,
  ScanBarcode,
  Bell,
  Shield,
] as const;

export function Features() {
  return (
    <section id="features" className="bg-slate-50 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to run your library
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From cataloging to checkout, renewals to reporting — built for
            librarians who need reliable tools, not complexity.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FEATURES.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] transition-colors group-hover:bg-[#2563EB] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
