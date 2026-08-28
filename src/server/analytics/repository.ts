import { and, eq, gte, lt } from "drizzle-orm";

import { db } from "@/server/db";
import { applicationStatusEvents, applications, jobMatches, savedJobs } from "@/server/db/schema";

export async function getDashboardAnalyticsRecords(userId: string, from?: Date, to?: Date) {
  const filters = <T>(column: T) => and(from ? gte(column as never, from) : undefined, to ? lt(column as never, to) : undefined);
  const [matches, saved, applicationRows] = await Promise.all([
    db.select({ jobId: jobMatches.jobId, occurredAt: jobMatches.createdAt }).from(jobMatches).where(and(eq(jobMatches.userId, userId), filters(jobMatches.createdAt))),
    db.select({ jobId: savedJobs.jobId, occurredAt: savedJobs.createdAt }).from(savedJobs).where(and(eq(savedJobs.userId, userId), filters(savedJobs.createdAt))),
    db.select({ jobId: applications.jobId, status: applications.status, occurredAt: applications.createdAt, applicationId: applications.id }).from(applications).where(and(eq(applications.userId, userId), filters(applications.createdAt))),
  ]);
  const events = await db
    .select({ jobId: applications.jobId, toStatus: applicationStatusEvents.toStatus, occurredAt: applicationStatusEvents.occurredAt })
    .from(applicationStatusEvents)
    .innerJoin(applications, eq(applicationStatusEvents.applicationId, applications.id))
    .where(and(eq(applications.userId, userId), filters(applicationStatusEvents.occurredAt)));
  return { matches, savedJobs: saved, applications: applicationRows, statusEvents: events };
}