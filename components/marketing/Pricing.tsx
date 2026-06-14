import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PRICING } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Create a free account on any plan. Scale as your collection grows.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 shadow-sm",
                plan.highlighted
                  ? "border-[#2563EB] bg-white shadow-lg shadow-blue-500/10 ring-1 ring-[#2563EB]/20"
                  : "border-slate-200 bg-white"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2563EB] px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-slate-500">{plan.period}</span>
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  "mt-8 w-full",
                  plan.highlighted
                    ? "bg-[#2563EB] hover:bg-[#1E40AF]"
                    : "bg-slate-900 hover:bg-slate-800"
                )}
                asChild
              >
                {plan.cta === "Request Demo" ? (
                  <a href="mailto:hello@libraryinventory.com">{plan.cta}</a>
                ) : (
                  <Link href="/signup">{plan.cta}</Link>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
