import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { findProfile } from "@/server/profile/repository";
import { updateProfile } from "@/server/profile/service";
import { profileInput } from "@/server/profile/contracts";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const { id } = await context.params;
  const profile = await findProfile(id, session.user.id);
  if (!profile)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Profile not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: profile });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = profileInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Review the profile fields.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );

  try {
    const profile = await updateProfile((await context.params).id, session.user.id, parsed.data);
    if (!profile)
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Profile not found." } },
        { status: 404 },
      );
    return NextResponse.json({ data: profile });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED";
    if (code === "DUPLICATE_SKILL" || code === "END_DATE_BEFORE_START_DATE")
      return NextResponse.json(
        { error: { code, message: "Review duplicate skills and date ranges." } },
        { status: 422 },
      );
    return NextResponse.json(
      { error: { code: "PROFILE_UPDATE_FAILED", message: "We could not update your profile." } },
      { status: 500 },
    );
  }
}
