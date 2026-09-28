import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { applications, jobs } from "@/server/db/schema";
import type { EmailClassification } from "@/server/email-intelligence/contracts";
import { CONFIDENT_AUTO_MATCH_THRESHOLD } from "@/server/email-intelligence/contracts";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function senderDomain(sender: string) {
  const match = sender.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

export type EmailMatchOutcome =
  | { status: "matched"; applicationId: string }
  | { status: "pending_confirmation"; applicationId: string }
  | { status: "unmatched" };

/**
 * Matching priority per PROJECT_SPEC.md/IMPLEMENTATION_PLAN.md Phase 20: company+role first, then
 * sender domain, then leaves it unmatched for a human to link manually. Never silently attaches an
 * unrelated email — anything short of a single confident company+role match becomes
 * "pending_confirmation" for the user to confirm or ignore, not an automatic link.
 */
export async function matchEmailToApplication(
  userId: string,
  sender: string,
  classification: EmailClassification | null,
): Promise<EmailMatchOutcome> {
  const candidates = await db
    .select({ applicationId: applications.id, company: jobs.companyNormalized, title: jobs.titleNormalized, applicationUrl: jobs.canonicalApplicationUrl, updatedAt: applications.updatedAt })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(and(eq(applications.userId, userId), inArray(applications.status, ["applying", "applied", "assessment", "interview"])));

  if (candidates.length === 0) return { status: "unmatched" };

  if (classification?.company) {
    const normalizedCompany = normalize(classification.company);
    const companyMatches = candidates.filter((c) => c.company.includes(normalizedCompany) || normalizedCompany.includes(c.company));
    if (companyMatches.length === 1) {
      const roleMatches =
        !classification.role ||
        normalize(classification.role) === companyMatches[0].title ||
        companyMatches[0].title.includes(normalize(classification.role));
      return roleMatches && classification.confidence >= CONFIDENT_AUTO_MATCH_THRESHOLD
        ? { status: "matched", applicationId: companyMatches[0].applicationId }
        : { status: "pending_confirmation", applicationId: companyMatches[0].applicationId };
    }
    if (companyMatches.length > 1) {
      const mostRecent = companyMatches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
      return { status: "pending_confirmation", applicationId: mostRecent.applicationId };
    }
  }

  const domain = senderDomain(sender);
  if (domain) {
    const domainMatches = candidates.filter((c) => {
      try {
        return new URL(c.applicationUrl).hostname.toLowerCase().includes(domain);
      } catch {
        return false;
      }
    });
    if (domainMatches.length === 1) {
      return { status: "pending_confirmation", applicationId: domainMatches[0].applicationId };
    }
  }

  return { status: "unmatched" };
}
