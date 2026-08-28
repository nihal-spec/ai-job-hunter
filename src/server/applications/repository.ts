import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { applicationStatusEvents, applications, jobs, resumes } from "@/server/db/schema";

export async function listApplications(userId: string) {
  return db
    .select({ application: applications, job: jobs, resume: resumes })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(resumes, eq(applications.resumeId, resumes.id))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.updatedAt));
}

export async function findApplication(userId: string, id: string) {
  const [row] = await db
    .select({ application: applications, job: jobs, resume: resumes })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(resumes, eq(applications.resumeId, resumes.id))
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1);
  if (!row) return undefined;
  const events = await db
    .select()
    .from(applicationStatusEvents)
    .where(eq(applicationStatusEvents.applicationId, id))
    .orderBy(asc(applicationStatusEvents.occurredAt));
  return { ...row, events };
}
