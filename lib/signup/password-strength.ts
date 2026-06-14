export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: PasswordStrength;
  percent: number;
  requirements: PasswordRequirement[];
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: "8+ characters",
      met: password.length >= 8,
    },
    {
      id: "uppercase",
      label: "Uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "Number",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "Special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const requirements = getPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;

  let score: PasswordStrength = "weak";
  if (metCount === 4 && password.length >= 12) {
    score = "strong";
  } else if (metCount === 4) {
    score = "good";
  } else if (metCount >= 2) {
    score = "fair";
  }

  const percent =
    score === "strong"
      ? 100
      : score === "good"
        ? 75
        : score === "fair"
          ? 50
          : Math.max(10, metCount * 20);

  return { score, percent, requirements };
}

export function passwordStrengthLabel(score: PasswordStrength): string {
  return score.charAt(0).toUpperCase() + score.slice(1);
}

export function passwordStrengthColor(score: PasswordStrength): string {
  switch (score) {
    case "strong":
      return "bg-emerald-500";
    case "good":
      return "bg-blue-500";
    case "fair":
      return "bg-amber-500";
    default:
      return "bg-red-500";
  }
}
