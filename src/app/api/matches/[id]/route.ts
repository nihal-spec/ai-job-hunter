import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { findUserMatch } from "@/server/matching/service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const match = await findUserMatch(session.user.id, (await context.params).id);
  if (!match)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Match not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: match });
}
