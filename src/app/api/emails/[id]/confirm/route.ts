import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { categoryToApplicationStatus } from "@/server/email-intelligence/contracts";
import { findUserEmail, setEmailMatch } from "@/server/email-intelligence/repository";
import { changeApplicationStatus } from "@/server/applications/service";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const email = await findUserEmail(id, session.user.id);
  if (!email || !email.applicationId) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Email not found or has no candidate application." } },
      { status: 404 },
    );
  }

  await setEmailMatch(id, session.user.id, { applicationId: email.applicationId, matchStatus: "matched" });

  const targetStatus = email.classification ? categoryToApplicationStatus[email.classification] : undefined;
  if (targetStatus) {
    await changeApplicationStatus(
      session.user.id,
      email.applicationId,
      targetStatus,
      "Confirmed from a classified email by the user.",
      undefined,
      "email_sync",
    );
  }

  void recordAuditEvent({
    userId: session.user.id,
    action: "EMAIL_LINKED_TO_APPLICATION",
    resourceType: "email_message",
    resourceId: id,
    outcome: "success",
    metadata: { applicationId: email.applicationId },
  });

  return NextResponse.json({ data: { confirmed: true } });
}
