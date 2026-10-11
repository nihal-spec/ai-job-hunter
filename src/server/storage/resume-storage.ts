import { env } from "@/env";
import type { ObjectStorage } from "@/server/storage/contracts";
import { createLocalStorage } from "@/server/storage/local-storage";
import { createS3Storage } from "@/server/storage/s3-storage";

function buildResumeStorage(): ObjectStorage {
  if (env.STORAGE_PROVIDER === "s3") {
    if (!env.STORAGE_ENDPOINT || !env.STORAGE_BUCKET || !env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY) {
      throw new Error(
        "STORAGE_PROVIDER=s3 requires STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY.",
      );
    }
    return createS3Storage({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    });
  }
  return createLocalStorage(env.RESUME_STORAGE_PATH);
}

export const resumeStorage: ObjectStorage = buildResumeStorage();
