import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  candidateCertifications,
  candidateEducation,
  candidateExperiences,
  candidateLanguages,
  candidateLinks,
  candidateProjects,
  candidateProfiles,
  candidateSkills,
} from "@/server/db/schema";

export async function findProfile(id: string, userId: string) {
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)))
    .limit(1);
  if (!profile) return undefined;

  const [skills, experiences, education, projects, certifications, languages, links] =
    await Promise.all([
      db
        .select()
        .from(candidateSkills)
        .where(eq(candidateSkills.profileId, id))
        .orderBy(asc(candidateSkills.createdAt)),
      db
        .select()
        .from(candidateExperiences)
        .where(eq(candidateExperiences.profileId, id))
        .orderBy(asc(candidateExperiences.sortOrder)),
      db
        .select()
        .from(candidateEducation)
        .where(eq(candidateEducation.profileId, id))
        .orderBy(asc(candidateEducation.sortOrder)),
      db
        .select()
        .from(candidateProjects)
        .where(eq(candidateProjects.profileId, id))
        .orderBy(asc(candidateProjects.sortOrder)),
      db
        .select()
        .from(candidateCertifications)
        .where(eq(candidateCertifications.profileId, id))
        .orderBy(asc(candidateCertifications.sortOrder)),
      db
        .select()
        .from(candidateLanguages)
        .where(eq(candidateLanguages.profileId, id))
        .orderBy(asc(candidateLanguages.createdAt)),
      db
        .select()
        .from(candidateLinks)
        .where(eq(candidateLinks.profileId, id))
        .orderBy(asc(candidateLinks.createdAt)),
    ]);

  return { profile, skills, experiences, education, projects, certifications, languages, links };
}

export type CandidateProfileDetail = NonNullable<Awaited<ReturnType<typeof findProfile>>>;

export async function findActiveProfile(userId: string): Promise<CandidateProfileDetail | undefined> {
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.userId, userId), eq(candidateProfiles.isActive, true)))
    .limit(1);
  if (!profile) return undefined;
  return findProfile(profile.id, userId);
}

export function listProfiles(userId: string) {
  return db
    .select({
      id: candidateProfiles.id,
      name: candidateProfiles.name,
      professionalSummary: candidateProfiles.professionalSummary,
      yearsExperience: candidateProfiles.yearsExperience,
      isActive: candidateProfiles.isActive,
      sourceResumeId: candidateProfiles.sourceResumeId,
      createdAt: candidateProfiles.createdAt,
      updatedAt: candidateProfiles.updatedAt,
    })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .orderBy(asc(candidateProfiles.createdAt));
}
