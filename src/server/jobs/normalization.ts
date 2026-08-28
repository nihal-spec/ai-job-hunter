import { createHash } from "node:crypto";

import type { SourceJob } from "@/server/jobs/sources/contracts";

export type NormalizedJob = SourceJob & {
  companyNormalized: string;
  titleNormalized: string;
  locationNormalized: string | null;
  canonicalApplicationUrl: string;
  contentHash: string;
};

export function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalizeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("UNSAFE_APPLICATION_URL");
  }
  if (url.username || url.password) {
    throw new Error("UNSAFE_APPLICATION_URL");
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeJob(job: SourceJob): NormalizedJob {
  const canonicalApplicationUrl = canonicalizeUrl(job.applicationUrl);
  const companyNormalized = normalizeText(job.companyName);
  const titleNormalized = normalizeText(job.title);
  const locationNormalized = job.locationText ? normalizeText(job.locationText) : null;
  const contentHash = hashContent(
    JSON.stringify({
      company: companyNormalized,
      title: titleNormalized,
      location: locationNormalized,
      description: normalizeText(job.description),
    }),
  );

  return {
    ...job,
    companyName: job.companyName.trim(),
    title: job.title.trim(),
    description: job.description.trim(),
    locationText: job.locationText?.trim() || null,
    companyNormalized,
    titleNormalized,
    locationNormalized,
    canonicalApplicationUrl,
    contentHash,
  };
}
