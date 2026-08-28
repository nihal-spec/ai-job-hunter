import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { jobSourceRecords, jobSources, jobs } from "@/server/db/schema";
import { ingestJobSources } from "@/server/jobs/ingestion";
import type { JobSourceAdapter } from "@/server/jobs/sources/contracts";
import { JobSourceRegistry } from "@/server/jobs/sources/registry";

const fixtureId = crypto.randomUUID();
const sourceId = `phase8-${fixtureId}`;
const rawJob = {
  sourceName: "Phase 8 Fixture",
  sourceJobId: fixtureId,
  companyName: `Fixture Co ${fixtureId}`,
  title: `Frontend Engineer ${fixtureId}`,
  locationText: `Remote ${fixtureId}`,
  description: "Build React products",
  applicationUrl: `https://fixture.example/jobs/${fixtureId}?utm_source=test`,
  publishedAt: null,
  sourceUpdatedAt: null,
  rawData: { fixture: true },
};

const adapter: JobSourceAdapter<Record<string, unknown>> = {
  configuration: { slug: sourceId, name: "Phase 8 Fixture", adapterType: "fixture", enabled: true },
  fetchJobs: async () => [rawJob],
  normalizeJob: (job) => job as typeof rawJob,
  getSourceName: () => "Phase 8 Fixture",
  getApplicationUrl: () => rawJob.applicationUrl,
};

describe("job ingestion persistence", () => {
  it("creates once and updates the same source record on repeat ingestion", async () => {
    const registry = new JobSourceRegistry().register(adapter);
    const first = await ingestJobSources(registry);
    const second = await ingestJobSources(registry);

    expect(first[0]).toMatchObject({ fetched: 1, created: 1, duplicates: 0, failed: 0 });
    expect(second[0]).toMatchObject({ fetched: 1, updated: 1, created: 0, failed: 0 });

    const [source] = await db.select().from(jobSources).where(eq(jobSources.slug, sourceId));
    const records = await db
      .select()
      .from(jobSourceRecords)
      .where(eq(jobSourceRecords.sourceId, source!.id));
    const canonicalJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.canonicalApplicationUrl, `https://fixture.example/jobs/${fixtureId}`));
    expect(records).toHaveLength(1);
    expect(canonicalJobs).toHaveLength(1);
  });
});

afterAll(async () => {
  const [source] = await db.select().from(jobSources).where(eq(jobSources.slug, sourceId));
  if (source) {
    const records = await db
      .delete(jobSourceRecords)
      .where(eq(jobSourceRecords.sourceId, source.id))
      .returning({ jobId: jobSourceRecords.jobId });
    await db.delete(jobSources).where(eq(jobSources.id, source.id));
    for (const record of records) await db.delete(jobs).where(eq(jobs.id, record.jobId));
  }
  await db.$client.end();
});
