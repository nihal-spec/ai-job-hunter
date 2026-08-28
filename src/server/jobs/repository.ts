import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { jobMatches, jobSourceRecords, jobSources, jobs, savedJobs } from "@/server/db/schema";
import { decodeJobCursor, encodeJobCursor, type JobSearchInput } from "@/server/jobs/query";

export async function searchJobs(userId: string, input: JobSearchInput) {
  const cursor = decodeJobCursor(input.cursor);
  const textFilter = input.q
    ? or(
        ilike(jobs.title, `%${input.q}%`),
        ilike(jobs.companyName, `%${input.q}%`),
        ilike(jobs.description, `%${input.q}%`),
      )
    : undefined;
  const cursorFilter = cursor
    ? or(
        lt(jobs.createdAt, cursor.createdAt),
        and(eq(jobs.createdAt, cursor.createdAt), lt(jobs.id, cursor.id)),
      )
    : undefined;
  const scoreFilter =
    input.minScore === undefined
      ? undefined
      : sql`exists (select 1 from ${jobMatches} where ${jobMatches.jobId} = ${jobs.id} and ${jobMatches.userId} = ${userId} and ${jobMatches.overallScore} >= ${input.minScore})`;

  const rows = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "active"),
        textFilter,
        input.location ? ilike(jobs.locationText, `%${input.location}%`) : undefined,
        input.workplaceMode ? eq(jobs.workplaceMode, input.workplaceMode) : undefined,
        input.employmentType ? ilike(jobs.employmentType, input.employmentType) : undefined,
        cursorFilter,
        scoreFilter,
      ),
    )
    .orderBy(desc(jobs.createdAt), desc(jobs.id))
    .limit(input.limit + 1);

  const page = rows.slice(0, input.limit);
  const matches = page.length
    ? await db
        .select({
          id: jobMatches.id,
          jobId: jobMatches.jobId,
          overallScore: jobMatches.overallScore,
          strengths: jobMatches.strengths,
          gaps: jobMatches.gaps,
          recommendation: jobMatches.recommendation,
          updatedAt: jobMatches.updatedAt,
        })
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.userId, userId),
            inArray(
              jobMatches.jobId,
              page.map((job) => job.id),
            ),
          ),
        )
        .orderBy(desc(jobMatches.updatedAt))
    : [];
  const saves = page.length
    ? await db
        .select({ jobId: savedJobs.jobId })
        .from(savedJobs)
        .where(
          and(
            eq(savedJobs.userId, userId),
            inArray(
              savedJobs.jobId,
              page.map((job) => job.id),
            ),
          ),
        )
    : [];
  const savedIds = new Set(saves.map((saved) => saved.jobId));
  const matchByJob = new Map<string, (typeof matches)[number]>();
  for (const match of matches) if (!matchByJob.has(match.jobId)) matchByJob.set(match.jobId, match);

  return {
    jobs: page.map((job) => ({
      ...job,
      match: matchByJob.get(job.id) ?? null,
      saved: savedIds.has(job.id),
    })),
    nextCursor:
      rows.length > input.limit && page.at(-1)
        ? encodeJobCursor(page.at(-1)!.createdAt, page.at(-1)!.id)
        : null,
  };
}

export async function findJobDetail(userId: string, id: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.status, "active")))
    .limit(1);
  if (!job) return undefined;
  const [sources, matches, saves] = await Promise.all([
    db
      .select({ name: jobSources.name, applicationUrl: jobSourceRecords.applicationUrl })
      .from(jobSourceRecords)
      .innerJoin(jobSources, eq(jobSourceRecords.sourceId, jobSources.id))
      .where(and(eq(jobSourceRecords.jobId, id), eq(jobSourceRecords.active, true))),
    db
      .select()
      .from(jobMatches)
      .where(and(eq(jobMatches.jobId, id), eq(jobMatches.userId, userId)))
      .orderBy(desc(jobMatches.updatedAt))
      .limit(1),
    db
      .select({ id: savedJobs.id })
      .from(savedJobs)
      .where(and(eq(savedJobs.jobId, id), eq(savedJobs.userId, userId)))
      .limit(1),
  ]);
  return { job, sources, match: matches[0] ?? null, saved: Boolean(saves[0]) };
}
