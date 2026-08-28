import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { jobs } from "@/server/db/schema";
import { jobSearchInput } from "@/server/jobs/query";
import { findJobDetail, searchJobs } from "@/server/jobs/repository";

const jobId = crypto.randomUUID();
const userId = crypto.randomUUID();

describe("job discovery repository", () => {
  it("filters active jobs and returns a safe detail model", async () => {
    await db.insert(jobs).values({
      id: jobId,
      companyName: "Discovery Fixture",
      companyNormalized: "discovery fixture",
      title: "React Discovery Engineer",
      titleNormalized: "react discovery engineer",
      description: "Build accessible React experiences.",
      responsibilities: ["Build interfaces"],
      requirements: ["React"],
      skills: [{ name: "React", required: true }],
      locationText: "Remote India",
      locationNormalized: "remote india",
      workplaceMode: "remote",
      employmentType: "full-time",
      canonicalApplicationUrl: `https://example.com/discovery/${jobId}`,
      normalizationVersion: "test",
      contentHash: jobId,
    });

    const result = await searchJobs(
      userId,
      jobSearchInput.parse({ q: "Discovery", workplaceMode: "remote" }),
    );
    const detail = await findJobDetail(userId, jobId);
    expect(result.jobs.map((job) => job.id)).toContain(jobId);
    expect(detail?.job.id).toBe(jobId);
    expect(detail?.match).toBeNull();
  });
});

afterAll(async () => {
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.$client.end();
});
