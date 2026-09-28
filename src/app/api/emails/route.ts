import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { listUserEmails } from "@/server/email-intelligence/repository";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }
  return NextResponse.json({ data: await listUserEmails(session.user.id) });
}
