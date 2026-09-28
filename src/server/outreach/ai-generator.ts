import type { Job } from "@/server/db/schema";
import type { VerifiedCandidateFacts } from "@/server/assistant/contracts";
import { formatFactsForContext } from "@/server/assistant/facts";
import { getTextAIProvider } from "@/server/ai";
import { outreachStructuredSchema, type OutreachStructured } from "@/server/outreach/contracts";
import { logger } from "@/server/observability/logger";

/** Returns null (never throws) when no provider is configured or generation fails — caller falls back to the deterministic template. */
export async function tryGenerateOutreachWithAI(
  facts: VerifiedCandidateFacts,
  job: Job | null,
  contact: { name: string | null; company: string; role: string | null },
): Promise<OutreachStructured | null> {
  const provider = getTextAIProvider();
  if (!provider) return null;
  try {
    return await provider.generateStructuredObject({
      schemaName: "recruiter_outreach",
      schema: outreachStructuredSchema,
      system:
        "You write short, personalized recruiter/hiring-contact outreach emails using only the candidate's verified facts below. Never fabricate experience or achievements. Keep it under 150 words, professional, and specific to the role and company.",
      prompt: `${formatFactsForContext(facts)}\n\nCONTACT: ${contact.name ?? "Unknown"} (${contact.role ?? "Recruiter"}) at ${contact.company}\n${job ? `JOB: ${job.title} — ${job.description.slice(0, 2000)}` : "No specific job posting linked; write a general interest note."}`,
    });
  } catch (error) {
    logger.warn("AI outreach generation failed, falling back to deterministic template", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
