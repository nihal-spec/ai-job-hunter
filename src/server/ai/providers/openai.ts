import { z, type ZodType } from "zod";

import {
  AIProviderError,
  type AIProvider,
  type GenerateStructuredObjectInput,
  type GenerateTextInput,
} from "@/server/ai/contracts";

const baseUrl = "https://api.openai.com/v1";

export class OpenAIProvider implements AIProvider {
  readonly providerName = "openai";

  constructor(
    private readonly apiKey: string,
    readonly textModel: string,
    readonly embeddingModel: string,
    private readonly requestTimeoutMs: number,
    private readonly maxRetries: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, body: unknown): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      try {
        const response = await this.fetcher(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            lastError = new AIProviderError("REQUEST_FAILED", `OpenAI returned HTTP ${response.status}.`);
            continue;
          }
          throw new AIProviderError("REQUEST_FAILED", `OpenAI returned HTTP ${response.status}.`);
        }
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof AIProviderError) throw error;
        lastError = controller.signal.aborted
          ? new AIProviderError("REQUEST_TIMEOUT", "OpenAI request timed out.", { cause: error })
          : new AIProviderError("REQUEST_FAILED", "OpenAI request failed.", { cause: error });
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof AIProviderError
      ? lastError
      : new AIProviderError("REQUEST_FAILED", "OpenAI request failed after retries.");
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    const messages = [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      { role: "user", content: input.prompt },
    ];
    const data = await this.request<{ choices: Array<{ message: { content: string } }> }>(
      "/chat/completions",
      {
        model: this.textModel,
        messages,
        max_tokens: input.maxOutputTokens ?? 1024,
      },
    );
    const text = data.choices[0]?.message?.content;
    if (!text) throw new AIProviderError("INVALID_RESPONSE", "OpenAI returned no text content.");
    return text;
  }

  async generateStructuredObject<T>(input: GenerateStructuredObjectInput<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(input.schema as ZodType, { target: "draft-7" });
    const messages = [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      { role: "user", content: input.prompt },
    ];
    const data = await this.request<{ choices: Array<{ message: { content: string } }> }>(
      "/chat/completions",
      {
        model: this.textModel,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            schema: jsonSchema,
            strict: false,
          },
        },
      },
    );
    const raw = data.choices[0]?.message?.content;
    if (!raw) throw new AIProviderError("INVALID_RESPONSE", "OpenAI returned no structured content.");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new AIProviderError("INVALID_RESPONSE", "OpenAI returned invalid JSON.", { cause: error });
    }
    const parsed = input.schema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new AIProviderError("INVALID_RESPONSE", "OpenAI response failed schema validation.", {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const data = await this.request<{ data: Array<{ embedding: number[] }> }>("/embeddings", {
      model: this.embeddingModel,
      input: text,
    });
    const embedding = data.data[0]?.embedding;
    if (!embedding) throw new AIProviderError("INVALID_RESPONSE", "OpenAI returned no embedding.");
    return embedding;
  }
}
