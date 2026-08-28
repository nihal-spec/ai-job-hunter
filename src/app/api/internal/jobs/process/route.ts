import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/env";
import { workerOptions } from "@/server/processing/contracts";
import { processProcessingJobs } from "@/server/processing/service";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`)
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authorized." } }, { status: 401 });
  const parsed = workerOptions.safeParse({ batchSize: new URL(request.url).searchParams.get("batchSize") ?? env.WORKER_BATCH_SIZE });
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid batch size." } }, { status: 422 });
  return NextResponse.json({ data: await processProcessingJobs(randomUUID(), parsed.data.batchSize) }, { status: 200 });
}