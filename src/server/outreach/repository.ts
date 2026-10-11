import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { outreachEvents, outreachMessages } from "@/server/db/schema";
import type { OutreachStructured } from "@/server/outreach/contracts";

export function createOutreachDraft(input: {
  userId: string;
  contactId: string;
  jobId: string | null;
  applicationId: string | null;
  content: OutreachStructured;
  sourceFacts: Record<string, unknown>;
  aiProvider: string;
  aiModel: string;
  promptVersion: string;
  maxFollowUps: number;
}) {
  return db
    .insert(outreachMessages)
    .values({
      id: randomUUID(),
      userId: input.userId,
      contactId: input.contactId,
      jobId: input.jobId,
      applicationId: input.applicationId,
      subject: input.content.subject,
      body: input.content.body,
      status: "draft",
      sourceFacts: input.sourceFacts,
      aiProvider: input.aiProvider,
      aiModel: input.aiModel,
      promptVersion: input.promptVersion,
      maxFollowUps: input.maxFollowUps,
    })
    .returning();
}

export function listOutreach(userId: string) {
  return db.select().from(outreachMessages).where(eq(outreachMessages.userId, userId)).orderBy(desc(outreachMessages.createdAt));
}

export async function findOutreach(id: string, userId: string) {
  const [row] = await db.select().from(outreachMessages).where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, userId))).limit(1);
  return row;
}

export function markOutreachReady(id: string, userId: string, subject: string, body: string) {
  return db
    .update(outreachMessages)
    .set({ subject, body, status: "ready", updatedAt: new Date() })
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, userId), eq(outreachMessages.status, "draft")))
    .returning();
}

export function markOutreachSent(id: string, userId: string, providerMessageId: string) {
  return db
    .update(outreachMessages)
    .set({ status: "sent", providerMessageId, sentAt: new Date(), updatedAt: new Date() })
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, userId), eq(outreachMessages.status, "ready")))
    .returning();
}

export function incrementFollowUpCount(id: string, userId: string) {
  return db
    .update(outreachMessages)
    .set({ followUpCount: sql`${outreachMessages.followUpCount} + 1`, updatedAt: new Date() })
    .where(and(eq(outreachMessages.id, id), eq(outreachMessages.userId, userId)))
    .returning();
}

export function recordOutreachEvent(outreachId: string, type: string, note?: string) {
  return db.insert(outreachEvents).values({ id: randomUUID(), outreachId, type, note: note ?? null });
}
