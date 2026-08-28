import { createHash, randomUUID } from "node:crypto";

import { env } from "@/env";
import {
  countUserResumes,
  createResumeRecord,
  deleteUserResume,
  findUserResume,
  listUserResumes,
  nextResumeVersion,
} from "@/server/resume/repository";
import {
  acceptedResumeTypes,
  sanitizeDisplayName,
  validateResumeFile,
} from "@/server/resume/validation";
import { resumeStorage } from "@/server/storage/resume-storage";
import { enqueueJob } from "@/server/processing/service";

export class ResumeLimitError extends Error {}

export async function uploadResume(userId: string, file: File) {
  if ((await countUserResumes(userId)) >= env.RESUME_MAX_FILES_PER_USER) {
    throw new ResumeLimitError("Resume upload limit reached.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = await validateResumeFile(buffer, env.RESUME_MAX_FILE_BYTES);
  const id = randomUUID();
  const storageKey = `${userId}/${id}.${acceptedResumeTypes[mediaType]}`;
  const originalFileName = sanitizeDisplayName(file.name);
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  await resumeStorage.put(storageKey, buffer);

  try {
    await createResumeRecord({
      id,
      userId,
      displayName: originalFileName.replace(/\.(pdf|docx)$/i, ""),
      originalFileName,
      storageKey,
      mediaType,
      fileSizeBytes: buffer.byteLength,
      sha256,
      version: await nextResumeVersion(userId),
      status: "extracting",
    });
  } catch (error) {
    await resumeStorage.delete(storageKey);
    throw error;
  }

  await enqueueJob({
    type: "extract_resume",
    userId,
    entityType: "resume",
    entityId: id,
    payload: { resumeId: id, mediaType },
    idempotencyKey: `extract_resume:${id}`,
    maxAttempts: 3,
  });
  return findUserResume(id, userId);
}

export const getUserResumes = listUserResumes;

export async function removeResume(userId: string, id: string) {
  const resume = await findUserResume(id, userId);
  if (!resume) return false;

  await resumeStorage.delete(resume.storageKey);
  await deleteUserResume(id, userId);
  return true;
}
