import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { disconnectGmail } from "@/server/gmail/gmail-service";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });
  await disconnectGmail(session.user.id);
  void recordAuditEvent({
    userId: session.user.id,
    action: "GMAIL_DISCONNECTED",
    resourceType: "gmail_connection",
    outcome: "success",
  });
  return NextResponse.json({ data: { connected: false } });
}