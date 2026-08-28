import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { generateTailoredResumeInputSchema } from "@/server/assistant/contracts";
import { generateTailoredResumeRecommendations } from "@/server/assistant/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = generateTailoredResumeInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid resume recommendation options." } },
      { status: 422 },
    );
  }

  const { id: applicationId } = await context.params;
  const result = await generateTailoredResumeRecommendations(
    session.user.id,
    applicationId,
    parsed.data,
  );

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
            message: "You need an active candidate profile to generate tailored recommendations.",
          },
        },
        { status: 422 },
      );
    }
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
