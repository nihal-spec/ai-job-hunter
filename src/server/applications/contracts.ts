import { z } from "zod";

export const applicationStatuses = [
  "discovered",
  "saved",
  "applying",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export const applicationStatus = z.enum(applicationStatuses);
export type ApplicationStatus = z.infer<typeof applicationStatus>;

export const createApplicationInput = z.object({
  jobId: z.uuid(),
  resumeId: z.uuid().nullable().optional(),
  status: applicationStatus.default("applying"),
  notes: z.string().trim().max(5000).nullable().optional(),
  nextActionAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const updateApplicationInput = z.object({
  resumeId: z.uuid().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  nextActionAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const changeApplicationStatusInput = z.object({
  status: applicationStatus,
  note: z.string().trim().max(2000).nullable().optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
});

export const allowedStatusTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  discovered: ["saved", "applying", "withdrawn"],
  saved: ["applying", "withdrawn"],
  applying: ["applied", "withdrawn"],
  applied: ["assessment", "interview", "offer", "rejected", "withdrawn"],
  assessment: ["interview", "offer", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["rejected", "withdrawn"],
  rejected: [],
  withdrawn: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus) {
  return from === to || allowedStatusTransitions[from].includes(to);
}
