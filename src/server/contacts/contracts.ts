import { z } from "zod";

export const contactSources = ["job_posting", "company_info", "user"] as const;
export const contactSourceSchema = z.enum(contactSources);

export const createContactInput = z.object({
  jobId: z.uuid().nullable().optional(),
  company: z.string().trim().min(1).max(200),
  name: z.string().trim().max(200).nullable().optional(),
  role: z.string().trim().max(200).nullable().optional(),
  email: z.email().max(254).nullable().optional(),
});
export type CreateContactInput = z.infer<typeof createContactInput>;
