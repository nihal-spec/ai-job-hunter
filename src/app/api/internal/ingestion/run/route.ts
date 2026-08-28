import { NextResponse } from "next/server";

import { env } from "@/env";
import { enqueueJob } from "@/server/processing/service";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authorized." } },
      { status: 401 },
    );
  }
  const job = await enqueueJob({
    type: "ingest_jobs",
    entityType: "job_source_registry",
    entityId: crypto.randomUUID(),
    idempotencyKey: `ingest_jobs:${new Date().toISOString().slice(0, 13)}`,
    maxAttempts: env.WORKER_MAX_ATTEMPTS,
  });
  return NextResponse.json({ data: { id: job.id, status: job.status } }, { status: 202 });
}
