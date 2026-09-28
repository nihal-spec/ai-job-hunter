import { env } from "@/env";
import type { AIProvider } from "@/server/ai/contracts";
import { OpenAIProvider } from "@/server/ai/providers/openai";

let textProvider: AIProvider | null | undefined;
let embeddingProvider: AIProvider | null | undefined;

function buildProvider(kind: "text" | "embedding"): AIProvider | null {
  const selected = kind === "text" ? env.AI_TEXT_PROVIDER : env.AI_EMBEDDING_PROVIDER;
  if (selected === "none" || !env.AI_API_KEY) return null;
  if (selected === "openai") {
    return new OpenAIProvider(
      env.AI_API_KEY,
      env.AI_TEXT_MODEL,
      env.AI_EMBEDDING_MODEL,
      env.AI_REQUEST_TIMEOUT_MS,
      env.AI_MAX_RETRIES,
    );
  }
  return null;
}

/** Returns null when no AI provider is configured; callers must fall back to deterministic logic. */
export function getTextAIProvider(): AIProvider | null {
  if (textProvider === undefined) textProvider = buildProvider("text");
  return textProvider;
}

/** Returns null when no embedding provider is configured; callers must treat embeddings as unavailable. */
export function getEmbeddingAIProvider(): AIProvider | null {
  if (embeddingProvider === undefined) embeddingProvider = buildProvider("embedding");
  return embeddingProvider;
}

export type { AIProvider } from "@/server/ai/contracts";
export { AIProviderError } from "@/server/ai/contracts";
