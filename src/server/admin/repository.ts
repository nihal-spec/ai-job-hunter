import { count, desc, eq, gt, sql, sum } from "drizzle-orm";

import { db } from "@/server/db";
import {
  applications,
  contacts,
  emailMessages,
  gmailConnections,
  jobs,
  outreachMessages,
  processingJobs,
  resumes,
  usageCounters,
  users,
} from "@/server/db/schema";

export async function findUserAccessStatus(userId: string) {
  const [row] = await db
    .select({ role: users.role, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function listUsersForAdmin() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      role: users.role,
      disabledAt: users.disabledAt,
      resumeCount: sql<number>`(select count(*) from ${resumes} where ${resumes.userId} = ${users.id})`,
      applicationCount: sql<number>`(select count(*) from ${applications} where ${applications.userId} = ${users.id})`,
      gmailConnected: sql<boolean>`exists (select 1 from ${gmailConnections} where ${gmailConnections.userId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);
}

export function setUserDisabled(userId: string, disabled: boolean) {
  return db
    .update(users)
    .set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, disabledAt: users.disabledAt });
}

export async function getAdminOverviewCounts() {
  const [[userCount], [jobCount], [applicationCount], [pendingProcessing], [failedProcessing]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(jobs),
    db.select({ value: count() }).from(applications),
    db.select({ value: count() }).from(processingJobs).where(eq(processingJobs.status, "queued")),
    db.select({ value: count() }).from(processingJobs).where(eq(processingJobs.status, "failed")),
  ]);
  return {
    users: userCount?.value ?? 0,
    jobs: jobCount?.value ?? 0,
    applications: applicationCount?.value ?? 0,
    pendingProcessingJobs: pendingProcessing?.value ?? 0,
    failedProcessingJobs: failedProcessing?.value ?? 0,
  };
}

export function listRecentProcessingJobs() {
  return db.select().from(processingJobs).orderBy(desc(processingJobs.createdAt)).limit(50);
}

export function requeueProcessingJob(id: string) {
  return db
    .update(processingJobs)
    .set({ status: "queued", availableAt: new Date(), attemptCount: 0, lastErrorCode: null, lockedAt: null, lockedBy: null, leaseExpiresAt: null, updatedAt: new Date() })
    .where(eq(processingJobs.id, id))
    .returning({ id: processingJobs.id });
}

/** Aggregate call counts per scope only — never stores or surfaces individual prompts. */
export function getAiUsageSummary() {
  return db
    .select({ scope: usageCounters.scope, totalCalls: sum(usageCounters.count).mapWith(Number) })
    .from(usageCounters)
    .groupBy(usageCounters.scope);
}

export async function getGmailOutreachCounts() {
  const [[connections], [classifiedEmails], [pendingEmails], [outreachSent]] = await Promise.all([
    db.select({ value: count() }).from(gmailConnections),
    db.select({ value: count() }).from(emailMessages).where(gt(emailMessages.classificationConfidence, "0")),
    db.select({ value: count() }).from(emailMessages).where(eq(emailMessages.matchStatus, "pending_confirmation")),
    db.select({ value: count() }).from(outreachMessages).where(eq(outreachMessages.status, "sent")),
  ]);
  const [[contactCount]] = await Promise.all([db.select({ value: count() }).from(contacts)]);
  return {
    gmailConnections: connections?.value ?? 0,
    classifiedEmails: classifiedEmails?.value ?? 0,
    pendingEmailMatches: pendingEmails?.value ?? 0,
    outreachSent: outreachSent?.value ?? 0,
    contacts: contactCount?.value ?? 0,
  };
}
