import type { ZodType } from "zod";

export class AIProviderError extends Error {
  constructor(
    readonly code: "NOT_CONFIGURED" | "REQUEST_FAILED" | "REQUEST_TIMEOUT" | "INVALID_RESPONSE",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export type GenerateTextInput = {
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
};

export type GenerateStructuredObjectInput<T> = {
  system?: string;
  prompt: string;
  schema: ZodType<T>;
  schemaName: string;
};

export interface AIProvider {
  readonly providerName: string;
  readonly textModel: string;
  readonly embeddingModel: string;
  generateText(input: GenerateTextInput): Promise<string>;
  generateStructuredObject<T>(input: GenerateStructuredObjectInput<T>): Promise<T>;
  generateEmbedding(text: string): Promise<number[]>;
}
