import { NextResponse } from "next/server";
import { z } from "zod";

import { completeGmailConnection } from "@/server/gmail/gmail-service";
import { verifyOAuthState } from "@/server/gmail/gmail-oauth";
import { recordAuditEvent } from "@/server/audit/log";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/dashboard?gmail=error", request.url));
  let userId: string | undefined;
  try {
    userId = verifyOAuthState(state);
    if (!z.uuid().safeParse(userId).success) throw new Error("INVALID_OAUTH_STATE");
    await completeGmailConnection(userId, code);
    void recordAuditEvent({
      userId,
      action: "GMAIL_CONNECTED",
      resourceType: "gmail_connection",
      outcome: "success",
    });
    return NextResponse.redirect(new URL("/dashboard?gmail=connected", request.url));
  } catch {
    void recordAuditEvent({
      userId: userId ?? null,
      action: "GMAIL_CONNECTED",
      resourceType: "gmail_connection",
      outcome: "failure",
    });
    return NextResponse.redirect(new URL("/dashboard?gmail=error", request.url));
  }
}