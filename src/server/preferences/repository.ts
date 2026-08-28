import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { jobPreferences, preferenceRoles, preferenceSkills } from "@/server/db/schema";

export async function findPreference(id: string, userId: string) {
  const [preference] = await db
    .select()
    .from(jobPreferences)
    .where(and(eq(jobPreferences.id, id), eq(jobPreferences.userId, userId)))
    .limit(1);
  if (!preference) return undefined;
  const [roles, skills] = await Promise.all([
    db
      .select()
      .from(preferenceRoles)
      .where(eq(preferenceRoles.preferenceId, id))
      .orderBy(asc(preferenceRoles.priority)),
    db
      .select()
      .from(preferenceSkills)
      .where(eq(preferenceSkills.preferenceId, id))
      .orderBy(asc(preferenceSkills.createdAt)),
  ]);
  return { preference, roles, skills };
}

export function listPreferences(userId: string) {
  return db
    .select()
    .from(jobPreferences)
    .where(eq(jobPreferences.userId, userId))
    .orderBy(asc(jobPreferences.createdAt));
}
