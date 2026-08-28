import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/server/auth/request-session";
import { removeResume } from "@/server/resume/service";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );

  const parsed = z.uuid().safeParse((await context.params).id);
  if (!parsed.success || !(await removeResume(session.user.id, parsed.data))) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Resume not found." } },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
