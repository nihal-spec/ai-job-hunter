import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { findProcessingJob } from "@/server/processing/repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const [job] = await findProcessingJob(id, session.user.id);
  if (!job) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Processing job not found." } }, { status: 404 });
  return NextResponse.json({ data: { id: job.id, type: job.type, status: job.status, progress: job.progress, attemptCount: job.attemptCount, completedAt: job.completedAt, lastErrorCode: job.status === "failed" ? job.lastErrorCode : null } });
}