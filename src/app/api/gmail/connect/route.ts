import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { createGmailConnectUrl } from "@/server/gmail/gmail-service";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.redirect(new URL("/sign-in", request.url));
  try {
    return NextResponse.redirect(createGmailConnectUrl(session.user.id));
  } catch (error) {
    if (error instanceof Error && error.message === "GMAIL_NOT_CONFIGURED") return NextResponse.json({ error: { code: "GMAIL_NOT_CONFIGURED", message: "Gmail integration is not configured." } }, { status: 503 });
    throw error;
  }
}