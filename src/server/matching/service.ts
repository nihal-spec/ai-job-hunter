import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { candidateProfiles, jobMatches, jobPreferences, jobs } from "@/server/db/schema";
import {
  defaultMatchWeights,
  matchWeights,
  type JobSkill,
  type MatchInput,
} from "@/server/matching/contracts";
import { scoreMatch } from "@/server/matching/scorer";
import { findPreference } from "@/server/preferences/repository";
import { findProfile } from "@/server/profile/repository";

export const MATCH_ALGORITHM_VERSION = "deterministic-v1";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function jobSkills(value: unknown): JobSkill[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [{ name: item, required: true }];
    if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
      return [{ name: item.name, required: "required" in item ? Boolean(item.required) : true }];
    }
    return [];
  });
}

export async function calculateJobMatch(
  userId: string,
  jobId: string,
  profileId?: string,
  preferenceId?: string,
) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return undefined;

  const [activeProfile] = profileId
    ? await db
        .select()
        .from(candidateProfiles)
        .where(and(eq(candidateProfiles.id, profileId), eq(candidateProfiles.userId, userId)))
        .limit(1)
    : await db
        .select()
        .from(candidateProfiles)
        .where(and(eq(candidateProfiles.userId, userId), eq(candidateProfiles.isActive, true)))
        .limit(1);
  const [fallbackProfile] = activeProfile
    ? [activeProfile]
    : await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.userId, userId))
        .orderBy(desc(candidateProfiles.updatedAt))
        .limit(1);
  const profile = activeProfile ?? fallbackProfile;

  const [activePreference] = preferenceId
    ? await db
        .select()
        .from(jobPreferences)
        .where(and(eq(jobPreferences.id, preferenceId), eq(jobPreferences.userId, userId)))
        .limit(1)
    : await db
        .select()
        .from(jobPreferences)
        .where(and(eq(jobPreferences.userId, userId), eq(jobPreferences.isActive, true)))
        .limit(1);
  const [fallbackPreference] = activePreference
    ? [activePreference]
    : await db
        .select()
        .from(jobPreferences)
        .where(eq(jobPreferences.userId, userId))
        .orderBy(desc(jobPreferences.updatedAt))
        .limit(1);
  const preference = activePreference ?? fallbackPreference;
  if (!profile || !preference) throw new Error("MATCH_CONTEXT_REQUIRED");

  const [profileData, preferenceData] = await Promise.all([
    findProfile(profile.id, userId),
    findPreference(preference.id, userId),
  ]);
  if (!profileData || !preferenceData) throw new Error("MATCH_CONTEXT_REQUIRED");
  const parsedWeights = matchWeights.safeParse(preference.scoringWeights);

  const input: MatchInput = {
    candidate: {
      skills: profileData.skills.map((skill) => ({
        name: skill.name,
        verified: skill.verified,
        source: skill.source,
      })),
      yearsExperience: profile.yearsExperience ? Number(profile.yearsExperience) : null,
      experienceText: [
        ...profileData.experiences.flatMap((item) => [
          item.title,
          item.description ?? "",
          ...stringArray(item.highlights),
        ]),
        ...profileData.projects.flatMap((item) => [
          item.name,
          item.description ?? "",
          ...stringArray(item.technologies),
        ]),
      ],
      educationCount: profileData.education.length,
    },
    job: {
      title: job.title,
      companyName: job.companyName,
      description: job.description,
      responsibilities: stringArray(job.responsibilities),
      skills: jobSkills(job.skills),
      experienceMinYears: job.experienceMinYears ? Number(job.experienceMinYears) : null,
      experienceMaxYears: job.experienceMaxYears ? Number(job.experienceMaxYears) : null,
      locationText: job.locationText,
      workplaceMode: job.workplaceMode,
      employmentType: job.employmentType,
    },
    preferences: {
      roles: preferenceData.roles.map((item) => item.role),
      locations: stringArray(preference.locations),
      workplaceModes: stringArray(preference.workplaceModes),
      employmentTypes: stringArray(preference.employmentTypes),
      excludedKeywords: stringArray(preference.excludedKeywords),
      preferredCompanies: stringArray(preference.preferredCompanies),
      preferredSkills: preferenceData.skills.map((item) => item.skill),
      weights: parsedWeights.success ? parsedWeights.data : defaultMatchWeights,
    },
  };

  const result = scoreMatch(input);
  const values = {
    overallScore: result.overallScore.toFixed(2),
    skillsScore: result.components.skills.toFixed(2),
    experienceScore: result.components.experience.toFixed(2),
    responsibilitiesScore: result.components.responsibilities.toFixed(2),
    preferenceScore: result.components.preferences.toFixed(2),
    locationScore: result.components.location.toFixed(2),
    educationScore: result.components.education.toFixed(2),
    otherScore: result.components.other.toFixed(2),
    strengths: result.strengths,
    partialMatches: result.partialMatches,
    gaps: result.gaps,
    explanation: {
      ...result.evidence,
      category: result.category,
      disqualified: result.disqualified,
    },
    recommendation: result.recommendation,
    weights: input.preferences.weights,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: jobMatches.id })
    .from(jobMatches)
    .where(
      and(
        eq(jobMatches.userId, userId),
        eq(jobMatches.jobId, jobId),
        eq(jobMatches.profileId, profile.id),
        eq(jobMatches.preferenceId, preference.id),
        eq(jobMatches.algorithmVersion, MATCH_ALGORITHM_VERSION),
      ),
    )
    .limit(1);

  const [match] = existing
    ? await db.update(jobMatches).set(values).where(eq(jobMatches.id, existing.id)).returning()
    : await db
        .insert(jobMatches)
        .values({
          id: randomUUID(),
          userId,
          jobId,
          profileId: profile.id,
          preferenceId: preference.id,
          algorithmVersion: MATCH_ALGORITHM_VERSION,
          ...values,
        })
        .returning();
  return match;
}

export async function listUserMatches(userId: string) {
  return db
    .select()
    .from(jobMatches)
    .where(eq(jobMatches.userId, userId))
    .orderBy(desc(jobMatches.overallScore));
}

export async function findUserMatch(userId: string, id: string) {
  const [match] = await db
    .select()
    .from(jobMatches)
    .where(and(eq(jobMatches.id, id), eq(jobMatches.userId, userId)))
    .limit(1);
  return match;
}
