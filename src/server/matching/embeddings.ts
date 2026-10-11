import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { candidateProfiles, jobs } from "@/server/db/schema";
import { getEmbeddingAIProvider } from "@/server/ai";
import { env } from "@/env";
import { logger } from "@/server/observability/logger";

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildProfileEmbeddingText(profile: {
  professionalSummary: string | null;
  skills: { name: string }[];
  experiences: { title: string; description: string | null }[];
}) {
  return [
    profile.professionalSummary ?? "",
    profile.skills.map((skill) => skill.name).join(", "),
    profile.experiences.map((exp) => `${exp.title}: ${exp.description ?? ""}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8_000);
}

/** Lazily computes and caches a candidate profile's embedding; returns null if no embedding provider is configured. */
export async function ensureProfileEmbedding(
  profileId: string,
  profileData: {
    professionalSummary: string | null;
    skills: { name: string }[];
    experiences: { title: string; description: string | null }[];
  },
  existingEmbedding: number[] | null,
): Promise<number[] | null> {
  if (existingEmbedding) return existingEmbedding;
  const provider = getEmbeddingAIProvider();
  if (!provider) return null;

  try {
    const embedding = await provider.generateEmbedding(buildProfileEmbeddingText(profileData));
    await db
      .update(candidateProfiles)
      .set({ embedding, embeddingModel: env.AI_EMBEDDING_MODEL, updatedAt: new Date() })
      .where(eq(candidateProfiles.id, profileId));
    return embedding;
  } catch (error) {
    logger.warn("Profile embedding generation failed", {
      profileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Lazily computes and caches a job's embedding; returns null if no embedding provider is configured. */
export async function ensureJobEmbedding(
  jobId: string,
  jobText: string,
  existingEmbedding: number[] | null,
): Promise<number[] | null> {
  if (existingEmbedding) return existingEmbedding;
  const provider = getEmbeddingAIProvider();
  if (!provider) return null;

  try {
    const embedding = await provider.generateEmbedding(jobText.slice(0, 8_000));
    await db
      .update(jobs)
      .set({ embedding, embeddingModel: env.AI_EMBEDDING_MODEL, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
    return embedding;
  } catch (error) {
    logger.warn("Job embedding generation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
