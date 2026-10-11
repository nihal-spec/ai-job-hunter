import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/server/auth/request-session";
import { removeResume } from "@/server/resume/service";
import { recordAuditEvent } from "@/server/audit/log";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );

  const parsed = z.uuid().safeParse((await context.params).id);
  const deleted = parsed.success && (await removeResume(session.user.id, parsed.data));
  void recordAuditEvent({
    userId: session.user.id,
    action: "RESUME_DELETED",
    resourceType: "resume",
    resourceId: parsed.success ? parsed.data : null,
    outcome: deleted ? "success" : "failure",
  });
  if (!deleted) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Resume not found." } },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
