import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { generateOutreachInput } from "@/server/outreach/contracts";
import { generateOutreach, OutreachError } from "@/server/outreach/service";
import { listOutreach } from "@/server/outreach/repository";
import { enforceRateLimit, RateLimitExceededError } from "@/server/rate-limit/limiter";
import { recordAuditEvent } from "@/server/audit/log";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });
  return NextResponse.json({ data: await listOutreach(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });

  const parsed = generateOutreachInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid outreach request." } }, { status: 422 });

  try {
    await enforceRateLimit(session.user.id, "ai_generation");
    const draft = await generateOutreach(session.user.id, parsed.data);
    void recordAuditEvent({
      userId: session.user.id,
      action: "OUTREACH_CREATED",
      resourceType: "outreach_message",
      resourceId: draft.id,
      outcome: "success",
    });
    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } }, { status: 429 });
    }
    if (error instanceof OutreachError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 422 });
    }
    return NextResponse.json({ error: { code: "GENERATION_FAILED", message: "We could not draft that outreach." } }, { status: 500 });
  }
}
