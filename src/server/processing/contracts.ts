import { z } from "zod";

export const processingJobTypes = z.enum(["ingest_jobs", "extract_resume", "calculate_match"]);
export type ProcessingJobType = z.infer<typeof processingJobTypes>;

export const processingPayload = z.object({
  source: z.string().optional(),
  resumeId: z.uuid().optional(),
  jobId: z.uuid().optional(),
  profileId: z.uuid().optional(),
  preferenceId: z.uuid().optional(),
});

export const workerOptions = z.object({
  batchSize: z.coerce.number().int().min(1).max(50).default(10),
});

export function retryDelayMs(attempt: number) {
  return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export function isRetryable(attempt: number, maxAttempts: number) {
  return attempt < maxAttempts;
}