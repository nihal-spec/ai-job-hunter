import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { jobMatches, jobs, savedJobs } from "@/server/db/schema";

export async function saveJob(userId: string, jobId: string) {
  const [job] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "active")))
    .limit(1);
  if (!job) return undefined;
  const [saved] = await db
    .insert(savedJobs)
    .values({ userId, jobId })
    .onConflictDoNothing()
    .returning();
  if (saved) return saved;
  const [existing] = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
    .limit(1);
  return existing;
}

export async function unsaveJob(userId: string, jobId: string) {
  const [deleted] = await db
    .delete(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
    .returning({ id: savedJobs.id });
  return Boolean(deleted);
}

export async function listSavedJobs(userId: string) {
  const rows = await db
    .select({ savedAt: savedJobs.createdAt, job: jobs })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .where(and(eq(savedJobs.userId, userId), eq(jobs.status, "active")))
    .orderBy(desc(savedJobs.createdAt));
  const matches = rows.length
    ? await db
        .select()
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.userId, userId),
            inArray(
              jobMatches.jobId,
              rows.map((row) => row.job.id),
            ),
          ),
        )
        .orderBy(desc(jobMatches.updatedAt))
    : [];
  const matchByJob = new Map<string, (typeof matches)[number]>();
  for (const match of matches) if (!matchByJob.has(match.jobId)) matchByJob.set(match.jobId, match);
  return rows.map((row) => ({
    ...row.job,
    savedAt: row.savedAt,
    match: matchByJob.get(row.job.id) ?? null,
  }));
}
