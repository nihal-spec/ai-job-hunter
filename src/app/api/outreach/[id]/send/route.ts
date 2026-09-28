import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { sendOutreach, OutreachError } from "@/server/outreach/service";
import { enforceRateLimit, RateLimitExceededError } from "@/server/rate-limit/limiter";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });

  const { id } = await context.params;
  try {
    await enforceRateLimit(session.user.id, "outreach_send");
    const outreach = await sendOutreach(session.user.id, id);
    void recordAuditEvent({
      userId: session.user.id,
      action: "OUTREACH_SENT",
      resourceType: "outreach_message",
      resourceId: id,
      outcome: "success",
    });
    return NextResponse.json({ data: outreach });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many outreach sends. Try again later." } }, { status: 429 });
    }
    if (error instanceof OutreachError) {
      void recordAuditEvent({
        userId: session.user.id,
        action: "OUTREACH_SENT",
        resourceType: "outreach_message",
        resourceId: id,
        outcome: "failure",
        metadata: { code: error.code },
      });
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "GMAIL_NOT_CONNECTED" ? 409 : 422;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    throw error;
  }
}
