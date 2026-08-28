import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { getMaterialsForApplication } from "@/server/assistant/service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  const { id: applicationId } = await context.params;
  const result = await getMaterialsForApplication(session.user.id, applicationId);

  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Application not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: result.materials });
}
