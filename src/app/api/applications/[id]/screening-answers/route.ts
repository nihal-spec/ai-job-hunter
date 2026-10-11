import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { generateScreeningAnswersInputSchema } from "@/server/assistant/contracts";
import { generateScreeningAnswers } from "@/server/assistant/service";
import { enforceRateLimit, RateLimitExceededError } from "@/server/rate-limit/limiter";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = generateScreeningAnswersInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide at least one screening question (max 20).",
        },
      },
      { status: 422 },
    );
  }

  try {
    await enforceRateLimit(session.user.id, "ai_generation");
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many generation requests. Try again later." } },
        { status: 429 },
      );
    }
    throw error;
  }

  const { id: applicationId } = await context.params;
  const result = await generateScreeningAnswers(session.user.id, applicationId, parsed.data);

  if ("error" in result) {
    if (result.error === "APPLICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Application not found." } },
        { status: 404 },
      );
    }
    if (result.error === "ACTIVE_PROFILE_REQUIRED") {
      return NextResponse.json(
        {
          error: {
            code: "ACTIVE_PROFILE_REQUIRED",
            message: "You need an active candidate profile to generate screening answers.",
          },
        },
        { status: 422 },
      );
    }
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
