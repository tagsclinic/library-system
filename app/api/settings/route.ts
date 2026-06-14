import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getRequestMeta,
  isErrorResponse,
  requireAuth,
  serialize,
  validationError,
} from "@/lib/api-helpers";
import { canManageSettings } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import {
  appSettingsUpdateSchema,
  notificationTemplateSchema,
} from "@/lib/validations";

const settingsPatchSchema = z.object({
  settings: appSettingsUpdateSchema.optional(),
  templates: z.array(notificationTemplateSchema).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { organizationId } = auth;

  const [settings, templates] = await Promise.all([
    prisma.appSettings.findMany({
      where: { organizationId },
      orderBy: { key: "asc" },
    }),
    prisma.notificationTemplate.findMany({
      where: { organizationId },
      orderBy: { type: "asc" },
    }),
  ]);

  const settingsMap = Object.fromEntries(
    settings.map((s) => [s.key, s.value])
  );

  return NextResponse.json(
    serialize({
      settings: settingsMap,
      items: settings,
      templates,
    })
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!canManageSettings(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const normalizedBody =
    body && typeof body === "object" && ("settings" in body || "templates" in body)
      ? body
      : { settings: body };

  const parsed = settingsPatchSchema.safeParse(normalizedBody);
  if (!parsed.success) return validationError(parsed.error);

  const { organizationId } = auth;
  const { ipAddress, userAgent } = getRequestMeta(request);
  const updates = parsed.data.settings ?? {};
  const templateUpdates = parsed.data.templates ?? [];

  const existing = await prisma.appSettings.findMany({
    where: {
      organizationId,
      key: { in: Object.keys(updates) },
    },
  });
  const existingMap = new Map(existing.map((s) => [s.key, s]));

  const settingResults =
    Object.keys(updates).length > 0
      ? await prisma.$transaction(
          Object.entries(updates).map(([key, value]) =>
            prisma.appSettings.upsert({
              where: { organizationId_key: { organizationId, key } },
              create: { organizationId, key, value },
              update: { value },
            })
          )
        )
      : [];

  for (const setting of settingResults) {
    const previous = existingMap.get(setting.key);
    await logAudit({
      organizationId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      action: "UPDATE",
      entityType: "AppSettings",
      entityId: setting.id,
      description: `Updated setting "${setting.key}"`,
      previousData: previous ? serialize(previous) : null,
      newData: serialize(setting),
      ipAddress,
      userAgent,
    });
  }

  const templateResults =
    templateUpdates.length > 0
      ? await prisma.$transaction(
          templateUpdates.map((template) =>
            prisma.notificationTemplate.upsert({
              where: {
                organizationId_type: {
                  organizationId,
                  type: template.type,
                },
              },
              create: {
                organizationId,
                type: template.type,
                subject: template.subject,
                body: template.body,
              },
              update: {
                subject: template.subject,
                body: template.body,
              },
            })
          )
        )
      : [];

  for (const template of templateResults) {
    await logAudit({
      organizationId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      action: "UPDATE",
      entityType: "NotificationTemplate",
      entityId: template.id,
      description: `Updated notification template "${template.type}"`,
      newData: serialize(template),
      ipAddress,
      userAgent,
    });
  }

  const [allSettings, allTemplates] = await Promise.all([
    prisma.appSettings.findMany({
      where: { organizationId },
      orderBy: { key: "asc" },
    }),
    prisma.notificationTemplate.findMany({
      where: { organizationId },
      orderBy: { type: "asc" },
    }),
  ]);

  return NextResponse.json(
    serialize({
      settings: Object.fromEntries(allSettings.map((s) => [s.key, s.value])),
      items: allSettings,
      templates: allTemplates,
    })
  );
}
