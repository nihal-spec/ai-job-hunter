import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { applicationStatusEvents, applications, jobs, resumes } from "@/server/db/schema";
import { canTransition, type ApplicationStatus } from "@/server/applications/contracts";
import { findApplication } from "@/server/applications/repository";

export async function createApplication(
  userId: string,
  input: {
    jobId: string;
    resumeId?: string | null;
    status: ApplicationStatus;
    notes?: string | null;
    nextActionAt?: string | null;
  },
) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1);
  if (!job) return { error: "JOB_NOT_FOUND" as const };
  if (input.resumeId) {
    const [resume] = await db
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
      .limit(1);
    if (!resume) return { error: "RESUME_NOT_FOUND" as const };
  }
  const id = randomUUID();
  try {
    const result = await db.transaction(async (tx) => {
      const [application] = await tx
        .insert(applications)
        .values({
          id,
          userId,
          jobId: input.jobId,
          resumeId: input.resumeId ?? null,
          status: input.status,
          sourceUrl: job.canonicalApplicationUrl,
          notes: input.notes ?? null,
          nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
        })
        .returning();
      await tx.insert(applicationStatusEvents).values({
        id: randomUUID(),
        applicationId: id,
        fromStatus: null,
        toStatus: input.status,
        changedBy: "user",
        occurredAt: new Date(),
      });
      return application;
    });
    return { application: result };
  } catch (error) {
    if (error instanceof Error && error.message.includes("applications_user_job_idx"))
      return { error: "DUPLICATE_APPLICATION" as const };
    throw error;
  }
}

export async function updateApplication(
  userId: string,
  id: string,
  input: { resumeId?: string | null; notes?: string | null; nextActionAt?: string | null },
) {
  const existing = await findApplication(userId, id);
  if (!existing) return undefined;
  if (input.resumeId) {
    const [resume] = await db
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
      .limit(1);
    if (!resume) return { error: "RESUME_NOT_FOUND" as const };
  }
  const [application] = await db
    .update(applications)
    .set({
      resumeId: input.resumeId === undefined ? existing.application.resumeId : input.resumeId,
      notes: input.notes === undefined ? existing.application.notes : input.notes,
      nextActionAt:
        input.nextActionAt === undefined
          ? existing.application.nextActionAt
          : input.nextActionAt
            ? new Date(input.nextActionAt)
            : null,
      updatedAt: new Date(),
    })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();
  return { application };
}

export async function changeApplicationStatus(
  userId: string,
  id: string,
  status: ApplicationStatus,
  note?: string | null,
  occurredAt?: string,
) {
  const existing = await findApplication(userId, id);
  if (!existing) return { error: "NOT_FOUND" as const };
  if (!canTransition(existing.application.status, status))
    return { error: "INVALID_TRANSITION" as const };
  const timestamp = occurredAt ? new Date(occurredAt) : new Date();
  const result = await db.transaction(async (tx) => {
    const [application] = await tx
      .update(applications)
      .set({
        status,
        appliedAt:
          status === "applied" && !existing.application.appliedAt
            ? timestamp
            : existing.application.appliedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .returning();
    await tx.insert(applicationStatusEvents).values({
      id: randomUUID(),
      applicationId: id,
      fromStatus: existing.application.status,
      toStatus: status,
      changedBy: "user",
      note: note ?? null,
      occurredAt: timestamp,
    });
    return application;
  });
  return { application: result };
}
