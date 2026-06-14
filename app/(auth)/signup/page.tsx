"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  X,
} from "lucide-react";

import { LogoUpload } from "@/components/auth/LogoUpload";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { SignupMarketingPanel } from "@/components/auth/SignupMarketingPanel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/brand";
import {
  ORGANIZATION_NAME_EXAMPLES,
  ORGANIZATION_TYPES,
} from "@/lib/signup/constants";
import {
  slugifyOrganizationName,
  workspaceUrlPreview,
} from "@/lib/signup/slug";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Create Your Library" },
  { id: 2, title: "Your Account" },
  { id: 3, title: "Finish Setup" },
] as const;

const STEP_FIELDS: Record<number, (keyof SignupInput)[]> = {
  1: ["organizationName", "organizationType"],
  2: ["fullName", "email", "password", "confirmPassword"],
  3: ["agreeToTerms", "agreeToNotifications"],
};

function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: "",
      organizationType: "OTHER",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      logo: null,
      agreeToTerms: false,
      agreeToNotifications: false,
    },
    mode: "onChange",
  });

  const organizationName = form.watch("organizationName");
  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const slugPreview = slugifyOrganizationName(organizationName);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  async function goToNextStep() {
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  }

  async function onSubmit(values: SignupInput) {
    setLoading(true);

    try {
      const { confirmPassword: _, ...payload } = values;

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: data.error ?? "Could not create your account.",
        });
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.toLowerCase().trim(),
          password: values.password,
        }),
      });

      if (!loginRes.ok) {
        const loginData = await loginRes.json();
        toast({
          title: "Account created",
          description:
            loginData.error ??
            "Your workspace is ready. Please sign in.",
        });
        router.push("/login");
        return;
      }

      toast({
        title: "Welcome to LibraryInventory",
        description: `${data.data?.organizationName ?? "Your library"} is ready.`,
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:block">
        <SignupMarketingPanel />
      </div>

      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between border-b px-6 py-4 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {BRAND.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            Step {step} of {STEPS.length}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex gap-2">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    s.id <= step ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">
                {STEPS[step - 1].title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === 1 &&
                  "Tell us about your organization to get started."}
                {step === 2 && "Create your admin account credentials."}
                {step === 3 &&
                  "Add a logo and accept our terms to create your workspace."}
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Springfield Public Library"
                              autoComplete="organization"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Examples: {ORGANIZATION_NAME_EXAMPLES.join(" · ")}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {organizationName.trim().length >= 2 && (
                      <div className="rounded-lg border bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Globe className="h-3.5 w-3.5" />
                          Workspace URL
                        </div>
                        <p className="mt-1 font-mono text-sm text-primary">
                          {workspaceUrlPreview(slugPreview)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Slug: {slugPreview || "your-organization"}
                        </p>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="organizationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select organization type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ORGANIZATION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => void goToNextStep()}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jane Smith"
                              autoComplete="name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="admin@yourlibrary.org"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <PasswordStrengthMeter password={password} />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          {passwordsMatch && (
                            <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                              <Check className="h-3.5 w-3.5" />
                              Passwords match
                            </p>
                          )}
                          {passwordsMismatch && (
                            <p className="flex items-center gap-1.5 text-xs text-destructive">
                              <X className="h-3.5 w-3.5" />
                              Passwords do not match
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={() => void goToNextStep()}
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="logo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Logo</FormLabel>
                          <FormControl>
                            <LogoUpload
                              value={field.value}
                              onChange={field.onChange}
                              onError={(msg) =>
                                toast({
                                  variant: "destructive",
                                  title: "Logo upload failed",
                                  description: msg,
                                })
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) =>
                                field.onChange(checked === true)
                              }
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">
                              I agree to the{" "}
                              <Link
                                href="/"
                                className="text-primary hover:underline"
                              >
                                Terms of Service
                              </Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="agreeToNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) =>
                                field.onChange(checked === true)
                              }
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">
                              I agree to receive account notifications
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(2)}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating workspace...
                          </>
                        ) : (
                          "Create Workspace"
                        )}
                      </Button>
                    </div>
                  </>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
