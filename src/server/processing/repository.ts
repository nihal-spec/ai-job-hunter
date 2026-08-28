import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { processingJobs } from "@/server/db/schema";

export async function enqueueProcessingJob(input: {
  type: string;
  userId?: string | null;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  maxAttempts?: number;
}) {
  const [job] = await db
    .insert(processingJobs)
    .values({ id: randomUUID(), ...input, payload: input.payload ?? {} })
    .onConflictDoUpdate({
      target: processingJobs.idempotencyKey,
      set: { updatedAt: new Date() },
    })
    .returning();
  return job;
}

export async function claimProcessingJob(workerId: string, leaseMs: number) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + leaseMs);
  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT id
      FROM processing_jobs
      WHERE (
        status = 'queued' AND available_at <= ${now}
        OR status = 'processing' AND lease_expires_at < ${now}
      )
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE processing_jobs
    SET status = 'processing', locked_at = ${now}, locked_by = ${workerId},
        lease_expires_at = ${leaseUntil}, attempt_count = attempt_count + 1,
        updated_at = ${now}
    WHERE id IN (SELECT id FROM candidate)
    RETURNING *
  `);
  return result[0] as typeof processingJobs.$inferSelect | undefined;
}

export function completeProcessingJob(id: string, workerId: string) {
  return db
    .update(processingJobs)
    .set({ status: "completed", progress: 100, completedAt: new Date(), lockedAt: null, lockedBy: null, leaseExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(processingJobs.id, id), eq(processingJobs.lockedBy, workerId), eq(processingJobs.status, "processing")))
    .returning({ id: processingJobs.id });
}

export function failProcessingJob(id: string, workerId: string, retry: boolean, availableAt: Date, errorCode: string) {
  return db
    .update(processingJobs)
    .set({ status: retry ? "queued" : "failed", availableAt, lastErrorCode: errorCode, lockedAt: null, lockedBy: null, leaseExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(processingJobs.id, id), eq(processingJobs.lockedBy, workerId), eq(processingJobs.status, "processing")))
    .returning({ id: processingJobs.id });
}

export function findProcessingJob(id: string, userId: string) {
  return db.select().from(processingJobs).where(and(eq(processingJobs.id, id), eq(processingJobs.userId, userId))).limit(1);
}

export function updateProcessingJobProgress(id: string, workerId: string, progress: number) {
  return db
    .update(processingJobs)
    .set({ progress, updatedAt: new Date() })
    .where(and(eq(processingJobs.id, id), eq(processingJobs.lockedBy, workerId), eq(processingJobs.status, "processing")))
    .returning({ id: processingJobs.id });
}