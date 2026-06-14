"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { appSettingsUpdateSchema } from "@/lib/validations";

interface AppSetting {
  key: string;
  value: string;
  description: string | null;
}

const settingsFormSchema = z.object({
  settings: appSettingsUpdateSchema,
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: { settings: {} },
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load settings");

        const settings: AppSetting[] = json.items ?? [];
        setAppSettings(settings);

        const settingsMap: Record<string, string> = json.settings ?? {};
        settings.forEach((s) => {
          if (!(s.key in settingsMap)) settingsMap[s.key] = s.value;
        });
        settingsForm.reset({ settings: settingsMap });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to load settings",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [settingsForm, toast]);

  async function saveSettings(values: SettingsFormValues) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values.settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save settings");

      toast({ title: "Settings saved", description: "App settings updated." });
      if (json.items) setAppSettings(json.items);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner className="py-12" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure library system preferences (admin only)"
      />

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...settingsForm}>
            <form
              onSubmit={settingsForm.handleSubmit(saveSettings)}
              className="space-y-4"
            >
              {appSettings.map((setting) => (
                <FormField
                  key={setting.key}
                  control={settingsForm.control}
                  name={`settings.${setting.key}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{setting.key}</FormLabel>
                      {setting.description && (
                        <FormDescription>{setting.description}</FormDescription>
                      )}
                      <FormControl>
                        {setting.value.length > 100 ? (
                          <Textarea {...field} />
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification templates (DUE_SOON, OVERDUE, RENEWAL_APPROVED, etc.) are
            seeded in the database. Template editing via API will be available in a
            future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
