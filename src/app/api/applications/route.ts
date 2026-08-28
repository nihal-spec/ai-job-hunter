import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { createApplicationInput } from "@/server/applications/contracts";
import { listApplications } from "@/server/applications/repository";
import { createApplication } from "@/server/applications/service";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  return NextResponse.json({ data: await listApplications(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = createApplicationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Review the application fields." } },
      { status: 422 },
    );
  const result = await createApplication(session.user.id, parsed.data);
  if ("error" in result)
    return NextResponse.json(
      {
        error: {
          code: result.error,
          message:
            result.error === "DUPLICATE_APPLICATION"
              ? "You already track this job."
              : "The selected job or resume was not found.",
        },
      },
      { status: result.error === "DUPLICATE_APPLICATION" ? 409 : 404 },
    );
  return NextResponse.json({ data: result.application }, { status: 201 });
}
