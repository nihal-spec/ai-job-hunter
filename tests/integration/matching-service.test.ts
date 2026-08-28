import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import {
  candidateProfiles,
  candidateSkills,
  jobMatches,
  jobPreferences,
  jobs,
  preferenceRoles,
  users,
} from "@/server/db/schema";
import { calculateJobMatch } from "@/server/matching/service";
import { defaultMatchWeights } from "@/server/matching/contracts";

const userId = crypto.randomUUID();
const profileId = crypto.randomUUID();
const preferenceId = crypto.randomUUID();
const jobId = crypto.randomUUID();

describe("matching service persistence", () => {
  it("upserts one versioned match for repeated calculations", async () => {
    await db
      .insert(users)
      .values({ id: userId, email: `${userId}@example.com`, name: "Matcher", emailVerified: true });
    await db
      .insert(candidateProfiles)
      .values({ id: profileId, userId, name: "Matcher", yearsExperience: "2.0", isActive: true });
    await db.insert(candidateSkills).values({
      profileId,
      name: "React",
      normalizedName: "react",
      category: "technical",
      source: "user",
      verified: true,
      confidence: "1",
    });
    await db.insert(jobPreferences).values({
      id: preferenceId,
      userId,
      name: "Frontend",
      isActive: true,
      workplaceModes: ["remote"],
      locations: ["India"],
      employmentTypes: ["full-time"],
      excludedKeywords: [],
      preferredCompanies: [],
      preferredSkills: ["React"],
      scoringWeights: defaultMatchWeights,
    });
    await db.insert(preferenceRoles).values({
      preferenceId,
      role: "Frontend Developer",
      normalizedRole: "frontend developer",
      priority: 0,
    });
    await db.insert(jobs).values({
      id: jobId,
      companyName: "Example",
      companyNormalized: "example",
      title: "Frontend Developer",
      titleNormalized: "frontend developer",
      description: "Build React products",
      responsibilities: ["Build React products"],
      requirements: [],
      skills: [{ name: "React", required: true }],
      locationText: "Remote India",
      locationNormalized: "remote india",
      workplaceMode: "remote",
      employmentType: "full-time",
      canonicalApplicationUrl: `https://example.com/jobs/${jobId}`,
      status: "active",
      normalizationVersion: "test",
      contentHash: jobId,
    });

    const first = await calculateJobMatch(userId, jobId);
    const second = await calculateJobMatch(userId, jobId);
    const rows = await db.select().from(jobMatches).where(eq(jobMatches.userId, userId));
    expect(first?.id).toBe(second?.id);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.overallScore)).toBeGreaterThan(70);
  });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.$client.end();
});
