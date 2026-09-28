import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { syncGmailMessages } from "@/server/email-intelligence/sync-service";
import { GmailNotConnectedError } from "@/server/gmail/gmail-client";
import { enforceRateLimit, RateLimitExceededError } from "@/server/rate-limit/limiter";
import { recordAuditEvent } from "@/server/audit/log";

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  try {
    await enforceRateLimit(session.user.id, "gmail_sync");
    const result = await syncGmailMessages(session.user.id);
    void recordAuditEvent({
      userId: session.user.id,
      action: "GMAIL_SYNCED",
      resourceType: "email_sync",
      outcome: "success",
      metadata: { fetched: result.fetched, created: result.created },
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many syncs. Try again later." } },
        { status: 429 },
      );
    }
    if (error instanceof GmailNotConnectedError) {
      return NextResponse.json(
        { error: { code: "GMAIL_NOT_CONNECTED", message: "Connect Gmail first." } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message: "We could not sync your Gmail messages." } },
      { status: 500 },
    );
  }
}
