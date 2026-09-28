import { env } from "@/env";
import { findApplication } from "@/server/applications/repository";
import { findActiveProfile } from "@/server/profile/repository";
import type {
  GenerateCoverLetterInput,
  GenerateScreeningAnswersInput,
  GenerateTailoredResumeInput,
  UpdateMaterialInput,
} from "@/server/assistant/contracts";
import { extractVerifiedFacts } from "@/server/assistant/facts";
import {
  verifyCoverLetter,
  verifyScreeningAnswers,
  verifyTailoredResume,
} from "@/server/assistant/claim-verifier";
import {
  ASSISTANT_PROMPT_VERSION,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  generateCoverLetterContent,
  generateScreeningAnswersContent,
  generateTailoredResumeRecommendationsContent,
} from "@/server/assistant/generator";
import {
  tryGenerateCoverLetterWithAI,
  tryGenerateScreeningAnswersWithAI,
  tryGenerateTailoredResumeWithAI,
} from "@/server/assistant/ai-generator";
import {
  createApplicationMaterialRecord,
  getLatestMaterialVersion,
  listApplicationMaterials,
  updateApplicationMaterialRecord,
} from "@/server/assistant/repository";

export async function generateCoverLetter(
  userId: string,
  applicationId: string,
  input: GenerateCoverLetterInput = { tone: "professional" },
) {
  const applicationData = await findApplication(userId, applicationId);
  if (!applicationData) return { error: "APPLICATION_NOT_FOUND" as const };

  const activeProfile = await findActiveProfile(userId);
  if (!activeProfile) return { error: "ACTIVE_PROFILE_REQUIRED" as const };

  const verifiedFacts = extractVerifiedFacts(activeProfile);

  let structured = await tryGenerateCoverLetterWithAI(verifiedFacts, applicationData.job, input);
  let verification = structured ? verifyCoverLetter(structured, verifiedFacts) : null;
  let aiProvider = "openai";
  let aiModel = env.AI_TEXT_MODEL;

  if (!structured || !verification?.isValid) {
    structured = generateCoverLetterContent(verifiedFacts, applicationData.job, input);
    verification = verifyCoverLetter(structured, verifiedFacts);
    aiProvider = DEFAULT_AI_PROVIDER;
    aiModel = DEFAULT_AI_MODEL;
  }

  const currentVersion = await getLatestMaterialVersion(applicationId, "cover_letter");
  const nextVersion = currentVersion + 1;

  const record = await createApplicationMaterialRecord({
    applicationId,
    type: "cover_letter",
    version: nextVersion,
    content: structured.fullText,
    structuredContent: { ...structured, verification },
    sourceFacts: verifiedFacts,
    aiProvider,
    aiModel,
    promptVersion: ASSISTANT_PROMPT_VERSION,
    generationStatus: "completed",
  });

  return {
    material: record,
    structured,
    verification,
  };
}

export async function generateTailoredResumeRecommendations(
  userId: string,
  applicationId: string,
  input: GenerateTailoredResumeInput = {},
) {
  const applicationData = await findApplication(userId, applicationId);
  if (!applicationData) return { error: "APPLICATION_NOT_FOUND" as const };

  const activeProfile = await findActiveProfile(userId);
  if (!activeProfile) return { error: "ACTIVE_PROFILE_REQUIRED" as const };

  const verifiedFacts = extractVerifiedFacts(activeProfile);

  let structured = await tryGenerateTailoredResumeWithAI(verifiedFacts, applicationData.job, input);
  let verification = structured ? verifyTailoredResume(structured, verifiedFacts) : null;
  let aiProvider = "openai";
  let aiModel = env.AI_TEXT_MODEL;

  if (!structured || !verification?.isValid) {
    structured = generateTailoredResumeRecommendationsContent(
      verifiedFacts,
      applicationData.job,
      input,
    );
    verification = verifyTailoredResume(structured, verifiedFacts);
    aiProvider = DEFAULT_AI_PROVIDER;
    aiModel = DEFAULT_AI_MODEL;
  }

  const currentVersion = await getLatestMaterialVersion(
    applicationId,
    "tailored_resume_recommendations",
  );
  const nextVersion = currentVersion + 1;

  const record = await createApplicationMaterialRecord({
    applicationId,
    type: "tailored_resume_recommendations",
    version: nextVersion,
    content: structured.fullText,
    structuredContent: { ...structured, verification },
    sourceFacts: verifiedFacts,
    aiProvider,
    aiModel,
    promptVersion: ASSISTANT_PROMPT_VERSION,
    generationStatus: "completed",
  });

  return {
    material: record,
    structured,
    verification,
  };
}

export async function generateScreeningAnswers(
  userId: string,
  applicationId: string,
  input: GenerateScreeningAnswersInput,
) {
  const applicationData = await findApplication(userId, applicationId);
  if (!applicationData) return { error: "APPLICATION_NOT_FOUND" as const };

  const activeProfile = await findActiveProfile(userId);
  if (!activeProfile) return { error: "ACTIVE_PROFILE_REQUIRED" as const };

  const verifiedFacts = extractVerifiedFacts(activeProfile);

  let structured = await tryGenerateScreeningAnswersWithAI(verifiedFacts, applicationData.job, input);
  let verification = structured ? verifyScreeningAnswers(structured, verifiedFacts) : null;
  let aiProvider = "openai";
  let aiModel = env.AI_TEXT_MODEL;

  if (!structured || !verification?.isValid) {
    structured = generateScreeningAnswersContent(verifiedFacts, applicationData.job, input);
    verification = verifyScreeningAnswers(structured, verifiedFacts);
    aiProvider = DEFAULT_AI_PROVIDER;
    aiModel = DEFAULT_AI_MODEL;
  }

  const currentVersion = await getLatestMaterialVersion(applicationId, "screening_answers");
  const nextVersion = currentVersion + 1;

  const record = await createApplicationMaterialRecord({
    applicationId,
    type: "screening_answers",
    version: nextVersion,
    content: structured.fullText,
    structuredContent: { ...structured, verification },
    sourceFacts: verifiedFacts,
    aiProvider,
    aiModel,
    promptVersion: ASSISTANT_PROMPT_VERSION,
    generationStatus: "completed",
  });

  return {
    material: record,
    structured,
    verification,
  };
}

export async function getMaterialsForApplication(userId: string, applicationId: string) {
  const applicationData = await findApplication(userId, applicationId);
  if (!applicationData) return { error: "APPLICATION_NOT_FOUND" as const };

  const materials = await listApplicationMaterials(userId, applicationId);
  return { materials: materials.map((m) => m.material) };
}

export async function updateMaterial(
  userId: string,
  applicationId: string,
  materialId: string,
  input: UpdateMaterialInput,
) {
  const updated = await updateApplicationMaterialRecord(userId, applicationId, materialId, {
    content: input.content,
    structuredContent: input.structuredContent,
    userReviewedAt: input.markReviewed ? new Date() : undefined,
  });

  if (!updated) return { error: "MATERIAL_NOT_FOUND" as const };
  return { material: updated };
}
