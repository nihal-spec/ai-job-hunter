import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { listProfiles } from "@/server/profile/repository";
import { createEmptyProfile } from "@/server/profile/service";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  return NextResponse.json({ data: await listProfiles(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  return NextResponse.json({ data: await createEmptyProfile(session.user.id) }, { status: 201 });
}
