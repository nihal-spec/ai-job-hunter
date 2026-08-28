import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { activatePreference } from "@/server/preferences/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const preference = await activatePreference((await context.params).id, session.user.id);
  if (!preference)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Preference profile not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: preference });
}
