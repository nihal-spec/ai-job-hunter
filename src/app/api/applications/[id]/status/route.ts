import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { changeApplicationStatusInput } from "@/server/applications/contracts";
import { changeApplicationStatus } from "@/server/applications/service";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = changeApplicationStatusInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid status update." } },
      { status: 422 },
    );
  const result = await changeApplicationStatus(
    session.user.id,
    (await context.params).id,
    parsed.data.status,
    parsed.data.note,
    parsed.data.occurredAt,
  );
  const { id: applicationId } = await context.params;
  if ("error" in result) {
    void recordAuditEvent({
      userId: session.user.id,
      action: "APPLICATION_STATUS_CHANGED",
      resourceType: "application",
      resourceId: applicationId,
      outcome: "failure",
      metadata: { requestedStatus: parsed.data.status, error: result.error },
    });
    return NextResponse.json(
      {
        error: {
          code: result.error,
          message:
            result.error === "INVALID_TRANSITION"
              ? "That status change is not allowed."
              : "Application not found.",
        },
      },
      { status: result.error === "INVALID_TRANSITION" ? 409 : 404 },
    );
  }
  void recordAuditEvent({
    userId: session.user.id,
    action: "APPLICATION_STATUS_CHANGED",
    resourceType: "application",
    resourceId: applicationId,
    outcome: "success",
    metadata: { status: parsed.data.status },
  });
  return NextResponse.json({ data: result.application });
}
