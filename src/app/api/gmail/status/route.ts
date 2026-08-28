import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { getGmailStatus } from "@/server/gmail/gmail-service";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });
  return NextResponse.json({ data: await getGmailStatus(session.user.id) });
}