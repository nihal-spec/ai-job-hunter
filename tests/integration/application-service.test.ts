import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { applicationStatusEvents, jobs, users } from "@/server/db/schema";
import { changeApplicationStatus, createApplication } from "@/server/applications/service";

const userId = crypto.randomUUID();
const jobId = crypto.randomUUID();

describe("application service", () => {
  it("creates an application and records every status change", async () => {
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@example.com`,
        name: "Applicant",
        emailVerified: true,
      });
    await db
      .insert(jobs)
      .values({
        id: jobId,
        companyName: "Application Fixture",
        companyNormalized: "application fixture",
        title: "Engineer",
        titleNormalized: "engineer",
        description: "Role",
        canonicalApplicationUrl: `https://example.com/application/${jobId}`,
        normalizationVersion: "test",
        contentHash: jobId,
      });
    const created = await createApplication(userId, { jobId, status: "applying" });
    expect(created.application).toBeDefined();
    const applicationId = created.application!.id;
    const changed = await changeApplicationStatus(userId, applicationId, "applied");
    expect(changed.application?.status).toBe("applied");
    const events = await db
      .select()
      .from(applicationStatusEvents)
      .where(eq(applicationStatusEvents.applicationId, applicationId));
    expect(events).toHaveLength(2);
    expect(await changeApplicationStatus(userId, applicationId, "saved")).toMatchObject({
      error: "INVALID_TRANSITION",
    });
  });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.$client.end();
});
