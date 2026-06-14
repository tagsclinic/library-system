"use client";

import { Check, X } from "lucide-react";

import {
  getPasswordStrength,
  passwordStrengthColor,
  passwordStrengthLabel,
} from "@/lib/signup/password-strength";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, percent, requirements } = getPasswordStrength(password);
  const barColor = passwordStrengthColor(score);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Password Strength
        </span>
        <span
          className={cn(
            "font-semibold capitalize",
            score === "strong" && "text-emerald-600",
            score === "good" && "text-blue-600",
            score === "fair" && "text-amber-600",
            score === "weak" && "text-red-600"
          )}
        >
          {passwordStrengthLabel(score)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {requirements.map((req) => (
          <li
            key={req.id}
            className={cn(
              "flex items-center gap-2 text-xs",
              req.met ? "text-emerald-600" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 opacity-50" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
