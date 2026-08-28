import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/server/auth/request-session";
import { findJobDetail } from "@/server/jobs/repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Job not found." } },
      { status: 404 },
    );
  const detail = await findJobDetail(session.user.id, id.data);
  if (!detail)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Job not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: detail });
}
