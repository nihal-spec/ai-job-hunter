import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { findUserEmail, setEmailMatch } from "@/server/email-intelligence/repository";

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
  if (!email) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Email not found." } }, { status: 404 });
  }

  await setEmailMatch(id, session.user.id, { applicationId: null, matchStatus: "ignored" });
  return NextResponse.json({ data: { ignored: true } });
}
