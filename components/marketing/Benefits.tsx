import { Layers, MapPin, ShieldCheck, UserCheck, Zap } from "lucide-react";

import { BENEFITS } from "@/lib/brand";

const BENEFIT_ICONS = [Zap, MapPin, ShieldCheck, UserCheck, Layers] as const;

export function Benefits() {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for librarians,
              <span className="text-[#2563EB]"> loved by patrons</span>
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Stop juggling spreadsheets and paper logs. LibraryInventory gives
              your team a single source of truth for every book, borrower, and
              transaction.
            </p>
          </div>

          <div className="space-y-6">
            {BENEFITS.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[index];
              return (
                <div
                  key={benefit.title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {benefit.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
