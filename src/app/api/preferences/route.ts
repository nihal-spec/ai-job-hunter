import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { preferenceInput } from "@/server/preferences/contracts";
import { listPreferences } from "@/server/preferences/repository";
import { createPreference } from "@/server/preferences/service";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  return NextResponse.json({ data: await listPreferences(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = preferenceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Review the preference fields.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  try {
    return NextResponse.json(
      { data: await createPreference(session.user.id, parsed.data) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "PREFERENCE_CREATE_FAILED",
          message: "We could not create that preference profile.",
        },
      },
      { status: 409 },
    );
  }
}
