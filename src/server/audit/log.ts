import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

import { db } from "@/server/db";
import { auditEvents } from "@/server/db/schema";
import { logger } from "@/server/observability/logger";

export type AuditAction =
  | "USER_SIGNED_IN"
  | "USER_SIGNED_OUT"
  | "RESUME_UPLOADED"
  | "RESUME_DELETED"
  | "PROFILE_ACTIVATED"
  | "APPLICATION_STATUS_CHANGED"
  | "MATERIAL_GENERATED"
  | "GMAIL_CONNECTED"
  | "GMAIL_DISCONNECTED"
  | "GMAIL_SYNCED"
  | "EMAIL_CLASSIFIED"
  | "EMAIL_LINKED_TO_APPLICATION"
  | "OUTREACH_CREATED"
  | "OUTREACH_APPROVED"
  | "OUTREACH_SENT"
  | "ADMIN_USER_DISABLED"
  | "ADMIN_USER_ENABLED"
  | "ADMIN_SOURCE_ENABLED"
  | "ADMIN_SOURCE_DISABLED";

export type AuditOutcome = "success" | "failure";

/** Never pass resumes, tokens, prompts, or other sensitive payloads in `metadata` — see PROJECT_SPEC.md §18/§24. */
export function recordAuditEvent(input: {
  userId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  outcome: AuditOutcome;
  requestId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return db
    .insert(auditEvents)
    .values({
      id: randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      outcome: input.outcome,
      requestId: input.requestId ?? null,
      ipHash: input.ipAddress ? createHash("sha256").update(input.ipAddress).digest("hex") : null,
      metadata: input.metadata ?? {},
    })
    .catch((error) => {
      // Audit logging must never break the primary request path.
      logger.error("Failed to record audit event", {
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}
