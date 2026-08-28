import { randomUUID } from "node:crypto";

import { and, eq, notInArray, or } from "drizzle-orm";

import { db } from "@/server/db";
import { jobIngestionRuns, jobSourceRecords, jobSources, jobs } from "@/server/db/schema";
import { hashContent, normalizeJob, type NormalizedJob } from "@/server/jobs/normalization";
import { createJobSourceRegistry } from "@/server/jobs/sources/configuration";
import { JobSourceError } from "@/server/jobs/sources/contracts";
import { JobSourceRegistry } from "@/server/jobs/sources/registry";

export type IngestionSummary = {
  source: string;
  runId: string;
  fetched: number;
  created: number;
  updated: number;
  duplicates: number;
  failed: number;
};

function jsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

async function getOrCreateSource(source: {
  slug: string;
  name: string;
  adapterType: string;
  enabled: boolean;
}) {
  const [existing] = await db
    .select()
    .from(jobSources)
    .where(eq(jobSources.slug, source.slug))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(jobSources)
    .values({
      id: randomUUID(),
      slug: source.slug,
      name: source.name,
      adapterType: source.adapterType,
      enabled: source.enabled,
    })
    .returning();
  return created;
}

async function findExistingJob(job: NormalizedJob) {
  const [existing] = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.canonicalApplicationUrl, job.canonicalApplicationUrl),
        and(
          eq(jobs.companyNormalized, job.companyNormalized),
          eq(jobs.titleNormalized, job.titleNormalized),
          job.locationNormalized ? eq(jobs.locationNormalized, job.locationNormalized) : undefined,
        ),
      ),
    )
    .limit(1);
  return existing;
}

export async function persistNormalizedJob(sourceId: string, job: NormalizedJob) {
  return db.transaction(async (tx) => {
    const [existingSourceRecord] = await tx
      .select()
      .from(jobSourceRecords)
      .where(
        and(
          eq(jobSourceRecords.sourceId, sourceId),
          eq(jobSourceRecords.sourceJobId, job.sourceJobId),
        ),
      )
      .limit(1);

    const linkedJob = existingSourceRecord
      ? (await tx.select().from(jobs).where(eq(jobs.id, existingSourceRecord.jobId)).limit(1))[0]
      : undefined;
    const existingJob = linkedJob ?? (await findExistingJob(job));
    const now = new Date();
    let jobId = existingJob?.id;

    if (jobId) {
      await tx
        .update(jobs)
        .set({
          companyName: job.companyName,
          title: job.title,
          description: job.description,
          locationText: job.locationText,
          locationNormalized: job.locationNormalized,
          canonicalApplicationUrl: job.canonicalApplicationUrl,
          publishedAt: job.publishedAt,
          updatedAt: now,
          contentHash: job.contentHash,
        })
        .where(eq(jobs.id, jobId));
    } else {
      const [created] = await tx
        .insert(jobs)
        .values({
          id: randomUUID(),
          companyName: job.companyName,
          companyNormalized: job.companyNormalized,
          title: job.title,
          titleNormalized: job.titleNormalized,
          description: job.description,
          responsibilities: jsonArray([]),
          requirements: jsonArray([]),
          skills: jsonArray([]),
          locationText: job.locationText,
          locationNormalized: job.locationNormalized,
          canonicalApplicationUrl: job.canonicalApplicationUrl,
          publishedAt: job.publishedAt,
          status: "active",
          normalizationVersion: "normalizer-v1",
          contentHash: job.contentHash,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: jobs.id });
      jobId = created!.id;
    }

    const rawHash = hashContent(JSON.stringify(job.rawData));
    if (existingSourceRecord) {
      await tx
        .update(jobSourceRecords)
        .set({
          jobId,
          applicationUrl: job.applicationUrl,
          rawData: job.rawData,
          rawHash,
          lastSeenAt: now,
          active: true,
        })
        .where(eq(jobSourceRecords.id, existingSourceRecord.id));
      return "updated" as const;
    }

    await tx.insert(jobSourceRecords).values({
      id: randomUUID(),
      jobId,
      sourceId,
      sourceJobId: job.sourceJobId,
      applicationUrl: job.applicationUrl,
      rawData: job.rawData,
      rawHash,
      firstSeenAt: now,
      lastSeenAt: now,
      active: true,
    });
    return existingJob ? ("duplicate" as const) : ("created" as const);
  });
}

export async function ingestJobSources(
  registry: JobSourceRegistry,
  signal?: AbortSignal,
): Promise<IngestionSummary[]> {
  const summaries: IngestionSummary[] = [];

  for (const adapter of registry.enabled()) {
    const source = await getOrCreateSource(adapter.configuration);
    const runId = randomUUID();
    await db
      .insert(jobIngestionRuns)
      .values({ id: runId, sourceId: source!.id, status: "processing" });
    const summary: IngestionSummary = {
      source: adapter.configuration.slug,
      runId,
      fetched: 0,
      created: 0,
      updated: 0,
      duplicates: 0,
      failed: 0,
    };

    try {
      const rawJobs = await adapter.fetchJobs({ signal });
      summary.fetched = rawJobs.length;
      for (const rawJob of rawJobs) {
        try {
          const result = await persistNormalizedJob(
            source!.id,
            normalizeJob(adapter.normalizeJob(rawJob)),
          );
          summary[result === "duplicate" ? "duplicates" : result] += 1;
        } catch {
          summary.failed += 1;
        }
      }
      const sourceJobIds = rawJobs.map((rawJob) => adapter.normalizeJob(rawJob).sourceJobId);
      await db
        .update(jobSourceRecords)
        .set({ active: false })
        .where(
          sourceJobIds.length
            ? and(
                eq(jobSourceRecords.sourceId, source!.id),
                notInArray(jobSourceRecords.sourceJobId, sourceJobIds),
              )
            : eq(jobSourceRecords.sourceId, source!.id),
        );
      await db
        .update(jobIngestionRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          fetchedCount: summary.fetched,
          createdCount: summary.created,
          updatedCount: summary.updated,
          duplicateCount: summary.duplicates,
          failedCount: summary.failed,
        })
        .where(eq(jobIngestionRuns.id, runId));
    } catch (error) {
      summary.failed = summary.fetched;
      await db
        .update(jobIngestionRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          fetchedCount: summary.fetched,
          failedCount: summary.failed,
          errorCode: error instanceof JobSourceError ? error.code : "INGESTION_FAILED",
        })
        .where(eq(jobIngestionRuns.id, runId));
    }
    summaries.push(summary);
  }
  return summaries;
}

export function ingestConfiguredJobs(signal?: AbortSignal) {
  return ingestJobSources(createJobSourceRegistry(), signal);
}
