import { env } from "@/env";
import { ingestConfiguredJobs } from "@/server/jobs/ingestion";
import { processingPayload, retryDelayMs, isRetryable, type ProcessingJobType } from "@/server/processing/contracts";
import { claimProcessingJob, completeProcessingJob, enqueueProcessingJob, failProcessingJob, updateProcessingJobProgress } from "@/server/processing/repository";
import { extractResumeText, ResumeExtractionError } from "@/server/resume/extractor";
import { findUserResume, markResumeFailed, markResumeReady } from "@/server/resume/repository";
import { resumeStorage } from "@/server/storage/resume-storage";
import { calculateJobMatch } from "@/server/matching/service";

const handlers: Record<ProcessingJobType, (payload: unknown, job: { userId: string | null }) => Promise<void>> = {
  ingest_jobs: async (payload) => {
    processingPayload.parse(payload);
    await ingestConfiguredJobs();
  },
  extract_resume: async (payload, job) => {
    const input = processingPayload.parse(payload);
    if (!input.resumeId || !job.userId) throw new Error("RESUME_CONTEXT_REQUIRED");
    const resume = await findUserResume(input.resumeId, job.userId);
    if (!resume) throw new Error("RESUME_NOT_FOUND");
    try {
      const text = await extractResumeText(await resumeStorage.get(resume.storageKey), resume.mediaType as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      await markResumeReady(resume.id, resume.userId, text);
    } catch (error) {
      await markResumeFailed(resume.id, resume.userId, error instanceof ResumeExtractionError ? error.code : "CORRUPT_DOCUMENT");
      throw error;
    }
  },
  calculate_match: async (payload, job) => {
    const input = processingPayload.parse(payload);
    if (!job.userId || !input.jobId) throw new Error("MATCH_CONTEXT_REQUIRED");
    await calculateJobMatch(job.userId, input.jobId, input.profileId, input.preferenceId);
  },
};

export function enqueueJob(input: Parameters<typeof enqueueProcessingJob>[0]) {
  return enqueueProcessingJob(input);
}

export async function processProcessingJobs(workerId: string, batchSize: number) {
  const results: Array<{ id: string; status: "completed" | "failed" | "requeued" }> = [];
  for (let index = 0; index < batchSize; index += 1) {
    const job = await claimProcessingJob(workerId, env.WORKER_LEASE_SECONDS * 1000);
    if (!job) break;
    try {
      await updateProcessingJobProgress(job.id, workerId, 10);
      const type = job.type as ProcessingJobType;
      const handler = handlers[type];
      if (!handler) throw new Error("UNKNOWN_JOB_TYPE");
      await handler(job.payload, job);
      await completeProcessingJob(job.id, workerId);
      results.push({ id: job.id, status: "completed" });
    } catch (error) {
      const attempt = job.attemptCount;
      const retry = isRetryable(attempt, job.maxAttempts);
      await failProcessingJob(job.id, workerId, retry, new Date(Date.now() + retryDelayMs(attempt)), error instanceof Error ? error.message.slice(0, 100) : "PROCESSING_FAILED");
      results.push({ id: job.id, status: retry ? "requeued" : "failed" });
    }
  }
  return results;
}