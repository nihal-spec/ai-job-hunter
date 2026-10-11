import { env } from "@/env";
import { getTextAIProvider } from "@/server/ai";
import {
  getAdminOverviewCounts,
  getAiUsageSummary,
  getGmailOutreachCounts,
  listRecentProcessingJobs,
  listUsersForAdmin,
} from "@/server/admin/repository";

export async function getAdminDashboard() {
  const [overview, gmailOutreach, processingJobs, users, aiUsage] = await Promise.all([
    getAdminOverviewCounts(),
    getGmailOutreachCounts(),
    listRecentProcessingJobs(),
    listUsersForAdmin(),
    getAiUsageSummary(),
  ]);

  const systemHealth = {
    database: true, // if this query ran, the database is reachable
    aiProvider: getTextAIProvider() !== null,
    storage: env.STORAGE_PROVIDER === "s3" ? true : env.NODE_ENV !== "production",
    gmail: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    jobSources: env.JOB_SOURCE_GREENHOUSE_ENABLED && env.JOB_SOURCE_GREENHOUSE_BOARDS.length > 0,
  };

  return { overview, gmailOutreach, processingJobs, users, systemHealth, aiUsage };
}
