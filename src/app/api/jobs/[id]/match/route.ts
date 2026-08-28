import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/server/auth/request-session";
import { enqueueJob } from "@/server/processing/service";

const requestSchema = z.object({
  profileId: z.uuid().optional(),
  preferenceId: z.uuid().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid match context." } },
      { status: 422 },
    );
  const jobId = (await context.params).id;
  if (!z.uuid().safeParse(jobId).success)
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
  const job = await enqueueJob({
    type: "calculate_match",
    userId: session.user.id,
    entityType: "job",
    entityId: jobId,
    payload: { jobId, profileId: parsed.data.profileId, preferenceId: parsed.data.preferenceId },
    idempotencyKey: `calculate_match:${session.user.id}:${jobId}:${parsed.data.profileId ?? "active"}:${parsed.data.preferenceId ?? "active"}`,
  });
  return NextResponse.json({ data: { id: job.id, status: job.status } }, { status: 202 });
}
