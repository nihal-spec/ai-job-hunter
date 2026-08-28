import { describe, expect, it } from "vitest";

import { calculateDashboardAnalytics } from "@/server/analytics/contracts";

const date = (value: string) => new Date(`2026-01-${value}T00:00:00.000Z`);

describe("dashboard analytics", () => {
  it("calculates distinct funnel counts and safe rates", () => {
    const result = calculateDashboardAnalytics({
      matches: [{ jobId: "a", occurredAt: date("01") }, { jobId: "a", occurredAt: date("02") }, { jobId: "b", occurredAt: date("01") }],
      savedJobs: [{ jobId: "a", occurredAt: date("03") }],
      applications: [{ jobId: "a", status: "applied", occurredAt: date("04") }],
      statusEvents: [{ jobId: "a", toStatus: "applied", occurredAt: date("04") }, { jobId: "a", toStatus: "interview", occurredAt: date("05") }, { jobId: "a", toStatus: "offer", occurredAt: date("06") }],
    });
    expect(result.counts).toEqual({ discovered: 2, matched: 2, saved: 1, applied: 1, interview: 1, offer: 1, rejected: 0 });
    expect(result.rates).toEqual({ matchRate: 100, saveRate: 50, applicationRate: 100, interviewRate: 100, offerRate: 100 });
  });

  it("uses an inclusive start and exclusive end without inventing rates", () => {
    const result = calculateDashboardAnalytics({ matches: [{ jobId: "a", occurredAt: date("02") }], savedJobs: [], applications: [], statusEvents: [], range: { from: date("02"), to: date("03") } });
    expect(result.counts.discovered).toBe(1);
    expect(result.rates.applicationRate).toBeNull();
  });
});