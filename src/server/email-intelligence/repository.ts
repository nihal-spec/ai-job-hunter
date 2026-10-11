import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { emailMessages, emailThreads } from "@/server/db/schema";
import type { NormalizedGmailMessage } from "@/server/gmail/gmail-client";

export async function findOrCreateThread(userId: string, gmailThreadId: string, subject: string | null) {
  const [existing] = await db
    .select()
    .from(emailThreads)
    .where(and(eq(emailThreads.userId, userId), eq(emailThreads.gmailThreadId, gmailThreadId)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(emailThreads)
    .values({ id: randomUUID(), userId, gmailThreadId, subject })
    .onConflictDoNothing({ target: [emailThreads.userId, emailThreads.gmailThreadId] })
    .returning();
  if (created) return created;
  const [row] = await db
    .select()
    .from(emailThreads)
    .where(and(eq(emailThreads.userId, userId), eq(emailThreads.gmailThreadId, gmailThreadId)))
    .limit(1);
  return row;
}

/** Idempotent on (userId, providerMessageId) — re-syncing the same Gmail message is a no-op. */
export async function upsertEmailMessage(
  userId: string,
  threadId: string | null,
  message: NormalizedGmailMessage,
) {
  const [row] = await db
    .insert(emailMessages)
    .values({
      id: randomUUID(),
      userId,
      threadId,
      providerMessageId: message.providerMessageId,
      sender: message.sender,
      recipient: message.recipient,
      subject: message.subject,
      snippet: message.snippet,
      bodyText: message.bodyText,
      receivedAt: message.receivedAt,
    })
    .onConflictDoNothing({ target: [emailMessages.userId, emailMessages.providerMessageId] })
    .returning();
  if (row) return row;
  const [existing] = await db
    .select()
    .from(emailMessages)
    .where(and(eq(emailMessages.userId, userId), eq(emailMessages.providerMessageId, message.providerMessageId)))
    .limit(1);
  return existing;
}

export function setEmailClassification(
  id: string,
  userId: string,
  input: { classification: string; confidence: number },
) {
  return db
    .update(emailMessages)
    .set({
      classification: input.classification as (typeof emailMessages.$inferSelect)["classification"],
      classificationConfidence: input.confidence.toFixed(3),
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(emailMessages.id, id), eq(emailMessages.userId, userId)))
    .returning();
}

export function setEmailMatch(
  id: string,
  userId: string,
  input: { applicationId: string | null; matchStatus: "unmatched" | "pending_confirmation" | "matched" | "ignored" },
) {
  return db
    .update(emailMessages)
    .set({ applicationId: input.applicationId, matchStatus: input.matchStatus, updatedAt: new Date() })
    .where(and(eq(emailMessages.id, id), eq(emailMessages.userId, userId)))
    .returning();
}

export function listUserEmails(userId: string) {
  return db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.userId, userId))
    .orderBy(desc(emailMessages.receivedAt))
    .limit(100);
}

export async function findUserEmail(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(emailMessages)
    .where(and(eq(emailMessages.id, id), eq(emailMessages.userId, userId)))
    .limit(1);
  return row;
}
