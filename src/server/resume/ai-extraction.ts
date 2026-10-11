import { profileInput, type ProfileInput } from "@/server/profile/contracts";
import { createProfileFromResume, updateProfile } from "@/server/profile/service";
import { findUserResume } from "@/server/resume/repository";
import { getTextAIProvider } from "@/server/ai";
import { logger } from "@/server/observability/logger";

export class ProfileExtractionError extends Error {
  constructor(
    readonly code: "AI_NOT_CONFIGURED" | "RESUME_NOT_READY" | "EXTRACTION_FAILED",
    message: string,
  ) {
    super(message);
  }
}

const MAX_RESUME_CHARS = 12_000;

const extractionSystemPrompt = `You extract structured candidate profile data from resume text. Only include information explicitly present in the resume text. Never invent employers, dates, degrees, certifications, or skills that are not stated or clearly implied by the text. If a field is not present, omit it or leave the array empty. Do not include commentary outside the structured fields.`;

/**
 * Creates a draft candidate profile from a resume's extracted text using the configured AI
 * provider. Every fact is persisted with source "ai_inference" and verified: false (see
 * profileFactSource in src/server/db/schema.ts) — nothing here becomes a verified fact until the
 * user reviews and re-saves it through the normal profile editor, which is the only path that
 * marks facts as source "user" / verified: true. This preserves the "never silently convert an
 * inference into a verified skill" rule in PROJECT_SPEC.md §10.
 */
export async function createDraftProfileFromResume(userId: string, resumeId: string) {
  const provider = getTextAIProvider();
  if (!provider) {
    throw new ProfileExtractionError("AI_NOT_CONFIGURED", "No AI provider is configured.");
  }

  const resume = await findUserResume(resumeId, userId);
  if (!resume || resume.status !== "ready" || !resume.rawText) {
    throw new ProfileExtractionError("RESUME_NOT_READY", "Resume text is not available yet.");
  }

  let extracted: ProfileInput;
  try {
    extracted = await provider.generateStructuredObject({
      schemaName: "candidate_profile_extraction",
      schema: profileInput,
      system: extractionSystemPrompt,
      prompt: `Resume text:\n\n${resume.rawText.slice(0, MAX_RESUME_CHARS)}`,
    });
  } catch (error) {
    logger.warn("AI profile extraction failed", {
      resumeId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ProfileExtractionError("EXTRACTION_FAILED", "Could not extract a profile draft.");
  }

  const draftProfile = await createProfileFromResume(userId, resumeId);
  await updateProfile(draftProfile.id, userId, extracted, {
    source: "ai_inference",
    verified: false,
  });
  return draftProfile;
}
