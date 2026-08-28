import { and, count, desc, eq, max } from "drizzle-orm";

import { db } from "@/server/db";
import { resumes } from "@/server/db/schema";

export async function countUserResumes(userId: string) {
  const [result] = await db
    .select({ value: count() })
    .from(resumes)
    .where(eq(resumes.userId, userId));
  return result?.value ?? 0;
}

export async function nextResumeVersion(userId: string) {
  const [result] = await db
    .select({ value: max(resumes.version) })
    .from(resumes)
    .where(eq(resumes.userId, userId));
  return (result?.value ?? 0) + 1;
}

export function createResumeRecord(values: typeof resumes.$inferInsert) {
  return db.insert(resumes).values(values).returning();
}

export function markResumeReady(id: string, userId: string, rawText: string) {
  return db
    .update(resumes)
    .set({ status: "ready", rawText, parserVersion: "extractor-v1", updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning();
}

export function markResumeFailed(id: string, userId: string, failureCode: string) {
  return db
    .update(resumes)
    .set({ status: "failed", failureCode, updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning();
}

export function listUserResumes(userId: string) {
  return db
    .select({
      id: resumes.id,
      displayName: resumes.displayName,
      originalFileName: resumes.originalFileName,
      mediaType: resumes.mediaType,
      fileSizeBytes: resumes.fileSizeBytes,
      version: resumes.version,
      status: resumes.status,
      failureCode: resumes.failureCode,
      createdAt: resumes.createdAt,
      updatedAt: resumes.updatedAt,
    })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt));
}

export async function findUserResume(id: string, userId: string) {
  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .limit(1);
  return resume;
}

export function deleteUserResume(id: string, userId: string) {
  return db
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning({ id: resumes.id });
}
