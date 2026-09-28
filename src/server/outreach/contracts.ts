import { z } from "zod";

export const outreachStructuredSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});
export type OutreachStructured = z.infer<typeof outreachStructuredSchema>;

export const generateOutreachInput = z.object({
  contactId: z.uuid(),
  jobId: z.uuid().nullable().optional(),
  applicationId: z.uuid().nullable().optional(),
});
export type GenerateOutreachInput = z.infer<typeof generateOutreachInput>;

export const outreachStatuses = ["draft", "ready", "sent", "replied", "follow_up", "closed"] as const;
export const outreachStatusSchema = z.enum(outreachStatuses);
export type OutreachStatus = z.infer<typeof outreachStatusSchema>;

export const MAX_FOLLOW_UPS_DEFAULT = 1;

export const approveOutreachInput = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
});
export type ApproveOutreachInput = z.infer<typeof approveOutreachInput>;
