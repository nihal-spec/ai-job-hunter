import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { saveJob, unsaveJob } from "@/server/saved-jobs/repository";

async function currentSession(request: Request) {
  return getRequestSession(request.headers);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentSession(request);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const saved = await saveJob(session.user.id, (await context.params).id);
  if (!saved)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Job not found." } },
      { status: 404 },
    );
  return NextResponse.json({ data: { saved: true, savedAt: saved.createdAt } }, { status: 201 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentSession(request);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  await unsaveJob(session.user.id, (await context.params).id);
  return new NextResponse(null, { status: 204 });
}
