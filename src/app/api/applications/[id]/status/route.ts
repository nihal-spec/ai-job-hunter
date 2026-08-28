import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { changeApplicationStatusInput } from "@/server/applications/contracts";
import { changeApplicationStatus } from "@/server/applications/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = changeApplicationStatusInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid status update." } },
      { status: 422 },
    );
  const result = await changeApplicationStatus(
    session.user.id,
    (await context.params).id,
    parsed.data.status,
    parsed.data.note,
    parsed.data.occurredAt,
  );
  if ("error" in result)
    return NextResponse.json(
      {
        error: {
          code: result.error,
          message:
            result.error === "INVALID_TRANSITION"
              ? "That status change is not allowed."
              : "Application not found.",
        },
      },
      { status: result.error === "INVALID_TRANSITION" ? 409 : 404 },
    );
  return NextResponse.json({ data: result.application });
}
