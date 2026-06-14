import { BookOpen, Check } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { SIGNUP_FEATURES } from "@/lib/signup/constants";

export function SignupMarketingPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between bg-[#0F172A] p-10 text-white lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(37,99,235,0.25),transparent)]" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            {BRAND.name}
          </span>
        </div>

        <h2 className="mt-10 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
          Smart Library
          <br />
          Management Made
          <br />
          Simple.
        </h2>

        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
          {BRAND.tagline}
        </p>

        <ul className="mt-10 space-y-3">
          {SIGNUP_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="h-3 w-3" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-10 text-sm text-slate-500">
        Trusted by schools, libraries, churches, and nonprofits.
      </p>
    </div>
  );
}
