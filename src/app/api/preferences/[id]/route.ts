import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { preferenceInput } from "@/server/preferences/contracts";
import { findPreference } from "@/server/preferences/repository";
import { deletePreference, updatePreference } from "@/server/preferences/service";

async function session(request: Request) {
  return getRequestSession(request.headers);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await session(request);
  if (!current)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const result = await findPreference((await context.params).id, current.user.id);
  if (!result)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Preference profile not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: result });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await session(request);
  if (!current)
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
    const result = await updatePreference((await context.params).id, current.user.id, parsed.data);
    if (!result)
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Preference profile not found." } },
        { status: 404 },
      );
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "PREFERENCE_UPDATE_FAILED",
          message: "We could not update that preference profile.",
        },
      },
      { status: 409 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await session(request);
  if (!current)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  if (!(await deletePreference((await context.params).id, current.user.id)))
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Preference profile not found." } },
      { status: 404 },
    );
  return new NextResponse(null, { status: 204 });
}
