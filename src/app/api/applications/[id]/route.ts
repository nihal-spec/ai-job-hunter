import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { updateApplicationInput } from "@/server/applications/contracts";
import { findApplication } from "@/server/applications/repository";
import { updateApplication } from "@/server/applications/service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const result = await findApplication(session.user.id, (await context.params).id);
  if (!result)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Application not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: result });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = updateApplicationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Review the application fields." } },
      { status: 422 },
    );
  const result = await updateApplication(session.user.id, (await context.params).id, parsed.data);
  if (!result)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Application not found." } },
      { status: 404 },
    );
  if ("error" in result)
    return NextResponse.json(
      { error: { code: result.error, message: "Selected resume was not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: result.application });
}
