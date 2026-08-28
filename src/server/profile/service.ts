import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

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
import { findProfile } from "@/server/profile/repository";
import type { ProfileInput } from "@/server/profile/contracts";

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function validateDateOrder(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  if (startDate && endDate && endDate < startDate) throw new Error("END_DATE_BEFORE_START_DATE");
}

export async function updateProfile(id: string, userId: string, input: ProfileInput) {
  const existing = await findProfile(id, userId);
  if (!existing) return undefined;

  for (const item of [...input.experiences, ...input.education, ...input.projects]) {
    validateDateOrder(item.startDate, item.endDate);
  }
  for (const item of input.certifications) validateDateOrder(item.issuedAt, item.expiresAt);

  const skillKeys = new Set<string>();
  for (const skill of input.skills) {
    const key = `${normalized(skill.name)}:${normalized(skill.category)}`;
    if (skillKeys.has(key)) throw new Error("DUPLICATE_SKILL");
    skillKeys.add(key);
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    const [profile] = await tx
      .update(candidateProfiles)
      .set({
        name: input.name ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        locationText: input.locationText ?? null,
        countryCode: input.countryCode ?? null,
        professionalSummary: input.professionalSummary ?? null,
        yearsExperience: input.yearsExperience?.toFixed(1) ?? null,
        updatedAt: now,
      })
      .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)))
      .returning();

    await Promise.all([
      tx.delete(candidateSkills).where(eq(candidateSkills.profileId, id)),
      tx.delete(candidateExperiences).where(eq(candidateExperiences.profileId, id)),
      tx.delete(candidateEducation).where(eq(candidateEducation.profileId, id)),
      tx.delete(candidateProjects).where(eq(candidateProjects.profileId, id)),
      tx.delete(candidateCertifications).where(eq(candidateCertifications.profileId, id)),
      tx.delete(candidateLanguages).where(eq(candidateLanguages.profileId, id)),
      tx.delete(candidateLinks).where(eq(candidateLinks.profileId, id)),
    ]);

    if (input.skills.length) {
      await tx.insert(candidateSkills).values(
        input.skills.map((skill) => ({
          profileId: id,
          name: skill.name,
          normalizedName: normalized(skill.name),
          category: skill.category,
          source: "user" as const,
          verified: true,
          confidence: "1",
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    if (input.experiences.length)
      await tx.insert(candidateExperiences).values(
        input.experiences.map((item, index) => ({
          ...item,
          profileId: id,
          locationText: item.locationText ?? null,
          startDate: item.startDate ?? null,
          endDate: item.endDate ?? null,
          description: item.description ?? null,
          source: "user" as const,
          verified: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    if (input.education.length)
      await tx.insert(candidateEducation).values(
        input.education.map((item, index) => ({
          ...item,
          profileId: id,
          qualification: item.qualification ?? null,
          fieldOfStudy: item.fieldOfStudy ?? null,
          startDate: item.startDate ?? null,
          endDate: item.endDate ?? null,
          grade: item.grade ?? null,
          description: item.description ?? null,
          source: "user" as const,
          verified: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    if (input.projects.length)
      await tx.insert(candidateProjects).values(
        input.projects.map((item, index) => ({
          ...item,
          profileId: id,
          description: item.description ?? null,
          role: item.role ?? null,
          url: item.url ?? null,
          startDate: item.startDate ?? null,
          endDate: item.endDate ?? null,
          source: "user" as const,
          verified: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    if (input.certifications.length)
      await tx.insert(candidateCertifications).values(
        input.certifications.map((item, index) => ({
          ...item,
          profileId: id,
          issuer: item.issuer ?? null,
          issuedAt: item.issuedAt ?? null,
          expiresAt: item.expiresAt ?? null,
          credentialId: item.credentialId ?? null,
          credentialUrl: item.credentialUrl ?? null,
          source: "user" as const,
          verified: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    if (input.languages.length)
      await tx.insert(candidateLanguages).values(
        input.languages.map((item) => ({
          ...item,
          profileId: id,
          proficiency: item.proficiency ?? null,
          source: "user" as const,
          verified: true,
          createdAt: now,
          updatedAt: now,
        })),
      );
    if (input.links.length)
      await tx.insert(candidateLinks).values(
        input.links.map((item) => ({
          ...item,
          profileId: id,
          label: item.label ?? null,
          source: "user" as const,
          verified: true,
          createdAt: now,
          updatedAt: now,
        })),
      );

    return profile;
  });
}

export async function createEmptyProfile(userId: string) {
  const [profile] = await db
    .insert(candidateProfiles)
    .values({ id: randomUUID(), userId })
    .returning();
  return profile;
}
