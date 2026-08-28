import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { jobPreferences, preferenceRoles, preferenceSkills } from "@/server/db/schema";
import { findPreference } from "@/server/preferences/repository";
import type { PreferenceInput } from "@/server/preferences/contracts";

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function unique(values: string[]) {
  return [...new Set(values.map(normalized))];
}

export async function createPreference(userId: string, input: PreferenceInput) {
  const [preference] = await db
    .insert(jobPreferences)
    .values({
      id: randomUUID(),
      userId,
      name: input.name,
      workplaceModes: unique(input.workplaceModes),
      locations: unique(input.locations),
      minSalary: input.minSalary?.toFixed(2) ?? null,
      salaryCurrency: input.salaryCurrency,
      maxExperienceYears: input.maxExperienceYears?.toFixed(1) ?? null,
      employmentTypes: unique(input.employmentTypes),
      excludedKeywords: unique(input.excludedKeywords),
      preferredCompanies: unique(input.preferredCompanies),
      preferredSkills: unique(input.skills.map((skill) => skill.name)),
      scoringWeights: input.scoringWeights,
    })
    .returning();
  await replaceChildren(preference.id, input);
  return findPreference(preference.id, userId);
}

async function replaceChildren(id: string, input: PreferenceInput) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(preferenceRoles).where(eq(preferenceRoles.preferenceId, id));
    await tx.delete(preferenceSkills).where(eq(preferenceSkills.preferenceId, id));
    if (input.roles.length)
      await tx.insert(preferenceRoles).values(
        input.roles.map((role, priority) => ({
          id: randomUUID(),
          preferenceId: id,
          role,
          normalizedRole: normalized(role),
          priority,
          createdAt: now,
          updatedAt: now,
        })),
      );
    if (input.skills.length)
      await tx.insert(preferenceSkills).values(
        input.skills.map((skill) => ({
          id: randomUUID(),
          preferenceId: id,
          skill: skill.name,
          normalizedSkill: normalized(skill.name),
          weight: skill.weight.toFixed(3),
          createdAt: now,
          updatedAt: now,
        })),
      );
  });
}

export async function updatePreference(id: string, userId: string, input: PreferenceInput) {
  const existing = await findPreference(id, userId);
  if (!existing) return undefined;
  const [preference] = await db
    .update(jobPreferences)
    .set({
      name: input.name,
      workplaceModes: unique(input.workplaceModes),
      locations: unique(input.locations),
      minSalary: input.minSalary?.toFixed(2) ?? null,
      salaryCurrency: input.salaryCurrency,
      maxExperienceYears: input.maxExperienceYears?.toFixed(1) ?? null,
      employmentTypes: unique(input.employmentTypes),
      excludedKeywords: unique(input.excludedKeywords),
      preferredCompanies: unique(input.preferredCompanies),
      preferredSkills: unique(input.skills.map((skill) => skill.name)),
      scoringWeights: input.scoringWeights,
      updatedAt: new Date(),
    })
    .where(and(eq(jobPreferences.id, id), eq(jobPreferences.userId, userId)))
    .returning();
  await replaceChildren(id, input);
  return preference;
}

export async function activatePreference(id: string, userId: string) {
  const existing = await findPreference(id, userId);
  if (!existing) return undefined;
  return db.transaction(async (tx) => {
    await tx
      .update(jobPreferences)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jobPreferences.userId, userId));
    const [active] = await tx
      .update(jobPreferences)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(jobPreferences.id, id), eq(jobPreferences.userId, userId)))
      .returning();
    return active;
  });
}

export async function deletePreference(id: string, userId: string) {
  const [deleted] = await db
    .delete(jobPreferences)
    .where(and(eq(jobPreferences.id, id), eq(jobPreferences.userId, userId)))
    .returning({ id: jobPreferences.id });
  return Boolean(deleted);
}
