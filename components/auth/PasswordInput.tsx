"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  showToggle?: boolean;
}

export function PasswordInput({
  className,
  showToggle = true,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn(showToggle && "pr-10", className)}
        {...props}
      />
      {showToggle && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
