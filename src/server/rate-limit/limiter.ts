import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { usageCounters } from "@/server/db/schema";

export type RateLimitScope =
  | "resume_upload"
  | "ai_generation"
  | "ingestion_trigger"
  | "gmail_sync"
  | "outreach_send";

const limits: Record<RateLimitScope, { max: number; windowMs: number }> = {
  resume_upload: { max: 10, windowMs: 24 * 60 * 60 * 1000 },
  ai_generation: { max: 50, windowMs: 24 * 60 * 60 * 1000 },
  ingestion_trigger: { max: 60, windowMs: 60 * 60 * 1000 },
  gmail_sync: { max: 120, windowMs: 60 * 60 * 1000 },
  outreach_send: { max: 20, windowMs: 24 * 60 * 60 * 1000 },
};

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: Date };

/**
 * Atomic Postgres-backed rate limiting via the existing `usage_counters` table (its unique
 * `(user_id, scope, period_start)` index makes the upsert below race-safe under concurrent
 * requests, including across serverless instances — unlike an in-memory counter).
 */
export async function checkRateLimit(userId: string, scope: RateLimitScope): Promise<RateLimitResult> {
  const { max, windowMs } = limits[scope];
  const now = Date.now();
  const periodStart = new Date(Math.floor(now / windowMs) * windowMs);
  const periodEnd = new Date(periodStart.getTime() + windowMs);

  const [row] = await db
    .insert(usageCounters)
    .values({ id: randomUUID(), userId, scope, periodStart, periodEnd, count: 1 })
    .onConflictDoUpdate({
      target: [usageCounters.userId, usageCounters.scope, usageCounters.periodStart],
      set: { count: sql`${usageCounters.count} + 1`, updatedAt: new Date() },
    })
    .returning({ count: usageCounters.count });

  return {
    allowed: row.count <= max,
    remaining: Math.max(0, max - row.count),
    resetAt: periodEnd,
  };
}

export class RateLimitExceededError extends Error {
  constructor(readonly scope: RateLimitScope, readonly resetAt: Date) {
    super(`Rate limit exceeded for ${scope}.`);
  }
}

/** Throws RateLimitExceededError when the caller is over quota; otherwise returns normally. */
export async function enforceRateLimit(userId: string, scope: RateLimitScope) {
  const result = await checkRateLimit(userId, scope);
  if (!result.allowed) throw new RateLimitExceededError(scope, result.resetAt);
  return result;
}
