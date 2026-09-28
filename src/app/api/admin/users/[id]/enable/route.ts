import { NextResponse } from "next/server";

import { getRequestAdminSession } from "@/server/auth/request-session";
import { setUserDisabled } from "@/server/admin/repository";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestAdminSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await context.params;
  const [updated] = await setUserDisabled(id, false);
  void recordAuditEvent({
    userId: session.user.id,
    action: "ADMIN_USER_ENABLED",
    resourceType: "user",
    resourceId: id,
    outcome: updated ? "success" : "failure",
  });
  if (!updated) return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found." } }, { status: 404 });
  return NextResponse.json({ data: updated });
}
