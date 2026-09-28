import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { createDraftProfileFromResume, ProfileExtractionError } from "@/server/resume/ai-extraction";
import { enforceRateLimit, RateLimitExceededError } from "@/server/rate-limit/limiter";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  try {
    await enforceRateLimit(session.user.id, "ai_generation");
    const { id: resumeId } = await context.params;
    const profile = await createDraftProfileFromResume(session.user.id, resumeId);
    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many generation requests. Try again later." } },
        { status: 429 },
      );
    }
    if (error instanceof ProfileExtractionError) {
      const status = error.code === "AI_NOT_CONFIGURED" ? 501 : error.code === "RESUME_NOT_READY" ? 409 : 422;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    return NextResponse.json(
      { error: { code: "EXTRACTION_FAILED", message: "We could not draft a profile from that resume." } },
      { status: 500 },
    );
  }
}
