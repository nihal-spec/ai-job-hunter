import { db } from "@/server/db";
import { jobs } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { findContact } from "@/server/contacts/repository";
import { findApplication } from "@/server/applications/repository";
import { findActiveProfile } from "@/server/profile/repository";
import { extractVerifiedFacts } from "@/server/assistant/facts";
import { env } from "@/env";
import { tryGenerateOutreachWithAI } from "@/server/outreach/ai-generator";
import { generateOutreachContent } from "@/server/outreach/generator";
import { MAX_FOLLOW_UPS_DEFAULT, type GenerateOutreachInput } from "@/server/outreach/contracts";
import {
  createOutreachDraft,
  findOutreach,
  incrementFollowUpCount,
  markOutreachReady,
  markOutreachSent,
  recordOutreachEvent,
} from "@/server/outreach/repository";
import { getValidAccessToken, sendMessage } from "@/server/gmail/gmail-client";
import { findGmailConnection } from "@/server/gmail/repository";

export class OutreachError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export async function generateOutreach(userId: string, input: GenerateOutreachInput) {
  const contact = await findContact(input.contactId, userId);
  if (!contact) throw new OutreachError("CONTACT_NOT_FOUND", "Contact not found.");
  if (!contact.email) throw new OutreachError("CONTACT_HAS_NO_EMAIL", "This contact has no email address.");

  const activeProfile = await findActiveProfile(userId);
  if (!activeProfile) throw new OutreachError("ACTIVE_PROFILE_REQUIRED", "You need an active candidate profile first.");
  const facts = extractVerifiedFacts(activeProfile);

  let job = null;
  if (input.applicationId) {
    const applicationData = await findApplication(userId, input.applicationId);
    job = applicationData?.job ?? null;
  } else if (input.jobId) {
    const [row] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1);
    job = row ?? null;
  }

  const aiResult = await tryGenerateOutreachWithAI(facts, job, contact);
  const content = aiResult ?? generateOutreachContent(facts, job, contact);

  const [draft] = await createOutreachDraft({
    userId,
    contactId: contact.id,
    jobId: job?.id ?? null,
    applicationId: input.applicationId ?? null,
    content,
    sourceFacts: facts,
    aiProvider: aiResult ? "openai" : "job-hunter-outreach",
    aiModel: aiResult ? env.AI_TEXT_MODEL : "template-v1",
    promptVersion: "outreach-v1",
    maxFollowUps: MAX_FOLLOW_UPS_DEFAULT,
  });
  return draft;
}

export async function approveOutreach(userId: string, id: string, subject: string, body: string) {
  const [updated] = await markOutreachReady(id, userId, subject, body);
  if (!updated) throw new OutreachError("NOT_FOUND_OR_NOT_DRAFT", "Outreach not found or already approved.");
  return updated;
}

export async function sendOutreach(userId: string, id: string) {
  const outreach = await findOutreach(id, userId);
  if (!outreach) throw new OutreachError("NOT_FOUND", "Outreach not found.");
  if (outreach.status !== "ready") throw new OutreachError("NOT_READY", "Outreach must be approved before sending.");

  const [connection] = await findGmailConnection(userId);
  if (!connection) throw new OutreachError("GMAIL_NOT_CONNECTED", "Connect Gmail before sending outreach.");

  const contact = await findContact(outreach.contactId, userId);
  if (!contact?.email) throw new OutreachError("CONTACT_HAS_NO_EMAIL", "This contact has no email address.");

  const accessToken = await getValidAccessToken(userId);
  const providerMessageId = await sendMessage(accessToken, {
    to: contact.email,
    subject: outreach.subject,
    body: outreach.body,
  });

  const [sent] = await markOutreachSent(id, userId, providerMessageId);
  await recordOutreachEvent(id, "sent");
  return sent;
}

export async function generateFollowUp(userId: string, id: string) {
  const outreach = await findOutreach(id, userId);
  if (!outreach) throw new OutreachError("NOT_FOUND", "Outreach not found.");
  if (outreach.status !== "sent" && outreach.status !== "replied")
    throw new OutreachError("NOT_SENT", "Only sent outreach can get a follow-up.");
  if (outreach.followUpCount >= outreach.maxFollowUps)
    throw new OutreachError("FOLLOW_UP_LIMIT_REACHED", "Follow-up limit reached for this outreach.");

  const draft = await generateOutreach(userId, {
    contactId: outreach.contactId,
    jobId: outreach.jobId,
    applicationId: outreach.applicationId,
  });
  await incrementFollowUpCount(id, userId);
  await recordOutreachEvent(id, "follow_up_generated");
  return draft;
}
