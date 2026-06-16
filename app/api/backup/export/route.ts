import { NextResponse } from "next/server";

import { isErrorResponse, requireAuth, requireOrgAdmin } from "@/lib/api-helpers";
import { exportOrganizationBackup } from "@/lib/services/backup";

export async function GET() {
  const auth = await requireOrgAdmin();
  if (isErrorResponse(auth)) return auth;

  const buffer = await exportOrganizationBackup(auth.organizationId);
  const filename = `library-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
