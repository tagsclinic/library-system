import { NextResponse, type NextRequest } from "next/server";

import { getRequestMeta, isErrorResponse, requireOrgAdmin } from "@/lib/api-helpers";
import { logAudit } from "@/lib/services/audit";
import { importOrganizationBackup } from "@/lib/services/backup";

export async function POST(request: NextRequest) {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload file is required" }, { status: 400 });
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Please upload an Excel (.xlsx) backup file" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importOrganizationBackup(auth.organizationId, buffer);
    const { ipAddress, userAgent } = getRequestMeta(request);

    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      action: "UPDATE",
      entityType: "Organization",
      entityId: auth.organizationId,
      description: "Imported organization backup",
      newData: result,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import backup file",
      },
      { status: 400 }
    );
  }
}
