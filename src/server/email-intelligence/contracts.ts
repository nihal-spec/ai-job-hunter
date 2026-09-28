import { z } from "zod";

export const emailCategories = [
  "application_confirmation",
  "interview_invitation",
  "assessment",
  "rejection",
  "offer",
  "recruiter_message",
  "application_follow_up",
  "other",
] as const;

export const emailCategorySchema = z.enum(emailCategories);
export type EmailCategory = z.infer<typeof emailCategorySchema>;

export const emailClassificationSchema = z.object({
  category: emailCategorySchema,
  company: z.string().nullable(),
  role: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type EmailClassification = z.infer<typeof emailClassificationSchema>;

/** Maps a classified email category to the application status it implies, when confident enough to act on. */
export const categoryToApplicationStatus: Partial<Record<EmailCategory, "applied" | "assessment" | "interview" | "rejected" | "offer">> = {
  application_confirmation: "applied",
  assessment: "assessment",
  interview_invitation: "interview",
  rejection: "rejected",
  offer: "offer",
};

export const CONFIDENT_AUTO_MATCH_THRESHOLD = 0.75;
