import { calculateDashboardAnalytics, type AnalyticsDateRange } from "@/server/analytics/contracts";
import { getDashboardAnalyticsRecords } from "@/server/analytics/repository";

export async function getDashboardAnalytics(userId: string, range: AnalyticsDateRange = {}) {
  return calculateDashboardAnalytics({ ...(await getDashboardAnalyticsRecords(userId, range.from, range.to)), range });
}