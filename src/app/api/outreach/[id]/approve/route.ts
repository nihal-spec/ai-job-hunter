import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { approveOutreachInput } from "@/server/outreach/contracts";
import { approveOutreach, OutreachError } from "@/server/outreach/service";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });

  const parsed = approveOutreachInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid outreach edits." } }, { status: 422 });

  try {
    const { id } = await context.params;
    const outreach = await approveOutreach(session.user.id, id, parsed.data.subject, parsed.data.body);
    void recordAuditEvent({
      userId: session.user.id,
      action: "OUTREACH_APPROVED",
      resourceType: "outreach_message",
      resourceId: id,
      outcome: "success",
    });
    return NextResponse.json({ data: outreach });
  } catch (error) {
    if (error instanceof OutreachError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 404 });
    }
    throw error;
  }
}
