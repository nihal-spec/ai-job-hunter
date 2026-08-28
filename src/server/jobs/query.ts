import { z } from "zod";

export const jobSearchInput = z.object({
  q: z.string().trim().max(100).default(""),
  location: z.string().trim().max(100).default(""),
  workplaceMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  employmentType: z.string().trim().max(50).default(""),
  minScore: z.coerce.number().min(0).max(100).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type JobSearchInput = z.infer<typeof jobSearchInput>;

export function parseJobSearch(params: URLSearchParams) {
  return jobSearchInput.safeParse(Object.fromEntries(params.entries()));
}

export function encodeJobCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString("base64url");
}

export function decodeJobCursor(cursor: string | undefined) {
  if (!cursor) return undefined;
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const parsed = z.tuple([z.iso.datetime(), z.uuid()]).safeParse(value);
    return parsed.success ? { createdAt: new Date(parsed.data[0]), id: parsed.data[1] } : undefined;
  } catch {
    return undefined;
  }
}
