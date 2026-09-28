import { changeApplicationStatus } from "@/server/applications/service";
import { classifyEmail } from "@/server/email-intelligence/classifier";
import { categoryToApplicationStatus } from "@/server/email-intelligence/contracts";
import { matchEmailToApplication } from "@/server/email-intelligence/matching";
import { findOrCreateThread, setEmailClassification, setEmailMatch, upsertEmailMessage } from "@/server/email-intelligence/repository";
import { getMessage, getValidAccessToken, listRecentJobRelatedMessageIds } from "@/server/gmail/gmail-client";
import { logger } from "@/server/observability/logger";

/** Bounded to one page (~25 messages) so this stays safe to call synchronously from a route handler, consistent with this codebase's existing AI-generation routes. */
export async function syncGmailMessages(userId: string) {
  const accessToken = await getValidAccessToken(userId);
  const { messages } = await listRecentJobRelatedMessageIds(accessToken);

  let created = 0;
  let classified = 0;
  let autoMatched = 0;

  for (const { id } of messages) {
    try {
      const message = await getMessage(accessToken, id);
      const thread = await findOrCreateThread(userId, message.gmailThreadId, message.subject);
      const stored = await upsertEmailMessage(userId, thread?.id ?? null, message);
      if (!stored || stored.processedAt) continue; // already synced and classified before
      created += 1;

      const classification = await classifyEmail(message);
      if (classification) {
        await setEmailClassification(stored.id, userId, {
          classification: classification.category,
          confidence: classification.confidence,
        });
        classified += 1;

        const outcome = await matchEmailToApplication(userId, message.sender, classification);
        if (outcome.status !== "unmatched") {
          await setEmailMatch(stored.id, userId, {
            applicationId: outcome.applicationId,
            matchStatus: outcome.status,
          });
        }

        if (outcome.status === "matched") {
          const targetStatus = categoryToApplicationStatus[classification.category];
          if (targetStatus) {
            await changeApplicationStatus(
              userId,
              outcome.applicationId,
              targetStatus,
              `Auto-updated from a classified email (${classification.category}, ${(classification.confidence * 100).toFixed(0)}% confidence).`,
              undefined,
              "email_sync",
            );
            autoMatched += 1;
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to sync one Gmail message", {
        messageId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { fetched: messages.length, created, classified, autoMatched };
}
