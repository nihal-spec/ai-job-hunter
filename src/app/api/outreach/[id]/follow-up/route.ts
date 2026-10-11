import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { generateFollowUp, OutreachError } from "@/server/outreach/service";
import { enforceRateLimit, RateLimitExceededError } from "@/server/rate-limit/limiter";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });

  try {
    await enforceRateLimit(session.user.id, "ai_generation");
    const { id } = await context.params;
    const draft = await generateFollowUp(session.user.id, id);
    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } }, { status: 429 });
    }
    if (error instanceof OutreachError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 422 });
    }
    throw error;
  }
}
