import { z } from "zod";

import type { ApplicationStatus } from "@/server/applications/contracts";

export const analyticsDateRange = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AnalyticsDateRange = z.infer<typeof analyticsDateRange>;
export type AnalyticsRecord = { jobId: string; occurredAt: Date };
export type AnalyticsApplication = AnalyticsRecord & { status: ApplicationStatus };
export type AnalyticsStatusEvent = AnalyticsRecord & { toStatus: ApplicationStatus };

export type DashboardAnalytics = {
  range: { from: string | null; to: string | null };
  counts: { discovered: number; matched: number; saved: number; applied: number; interview: number; offer: number; rejected: number };
  rates: { matchRate: number | null; saveRate: number | null; applicationRate: number | null; interviewRate: number | null; offerRate: number | null };
  denominatorNotes: { discovered: string; statusCounts: string };
};

function distinctCount(records: AnalyticsRecord[]) {
  return new Set(records.map((record) => record.jobId)).size;
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10;
}

export function calculateDashboardAnalytics(input: {
  matches: AnalyticsRecord[];
  savedJobs: AnalyticsRecord[];
  applications: AnalyticsApplication[];
  statusEvents: AnalyticsStatusEvent[];
  range?: AnalyticsDateRange;
}): DashboardAnalytics {
  const from = input.range?.from;
  const to = input.range?.to;
  const inRange = (record: AnalyticsRecord) => (!from || record.occurredAt >= from) && (!to || record.occurredAt < to);
  const matches = input.matches.filter(inRange);
  const savedJobs = input.savedJobs.filter(inRange);
  const applications = input.applications.filter(inRange);
  const statusEvents = input.statusEvents.filter(inRange);
  const discoveredJobs = new Set([...matches, ...savedJobs, ...applications].map((record) => record.jobId));
  const applied = new Set(statusEvents.filter((event) => event.toStatus === "applied").map((event) => event.jobId)).size;
  const interview = new Set(statusEvents.filter((event) => event.toStatus === "interview").map((event) => event.jobId)).size;
  const offer = new Set(statusEvents.filter((event) => event.toStatus === "offer").map((event) => event.jobId)).size;
  const rejected = new Set(statusEvents.filter((event) => event.toStatus === "rejected").map((event) => event.jobId)).size;
  const matched = distinctCount(matches);
  const saved = distinctCount(savedJobs);

  return {
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    counts: { discovered: discoveredJobs.size, matched, saved, applied, interview, offer, rejected },
    rates: {
      matchRate: rate(matched, discoveredJobs.size),
      saveRate: rate(saved, matched),
      applicationRate: rate(applied, saved),
      interviewRate: rate(interview, applied),
      offerRate: rate(offer, interview),
    },
    denominatorNotes: {
      discovered: "Distinct jobs observed through a match, save, or application.",
      statusCounts: "Distinct jobs with a matching current status or status event in the selected range.",
    },
  };
}