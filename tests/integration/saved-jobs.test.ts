import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { jobs, savedJobs, users } from "@/server/db/schema";
import { listSavedJobs, saveJob, unsaveJob } from "@/server/saved-jobs/repository";

const userId = crypto.randomUUID();
const otherUserId = crypto.randomUUID();
const jobId = crypto.randomUUID();

describe("saved jobs persistence", () => {
  it("is idempotent and scoped to the current user", async () => {
    await db.insert(users).values([
      { id: userId, email: `${userId}@example.com`, name: "Saver", emailVerified: true },
      { id: otherUserId, email: `${otherUserId}@example.com`, name: "Other", emailVerified: true },
    ]);
    await db.insert(jobs).values({
      id: jobId,
      companyName: "Saved Fixture",
      companyNormalized: "saved fixture",
      title: "Saved Engineer",
      titleNormalized: "saved engineer",
      description: "Saved fixture role",
      canonicalApplicationUrl: `https://example.com/saved/${jobId}`,
      normalizationVersion: "test",
      contentHash: jobId,
    });

    const [first, second] = await Promise.all([saveJob(userId, jobId), saveJob(userId, jobId)]);
    const rows = await db
      .select()
      .from(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(rows).toHaveLength(1);
    expect(await listSavedJobs(otherUserId)).toHaveLength(0);

    expect(await unsaveJob(userId, jobId)).toBe(true);
    expect(await unsaveJob(userId, jobId)).toBe(false);
  });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, otherUserId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.$client.end();
});
