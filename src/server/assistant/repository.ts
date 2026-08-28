import { randomUUID } from "node:crypto";

import { and, desc, eq, max } from "drizzle-orm";

import { db } from "@/server/db";
import { applicationMaterials, applications } from "@/server/db/schema";
import type { MaterialType } from "@/server/assistant/contracts";

export async function getLatestMaterialVersion(applicationId: string, type: MaterialType): Promise<number> {
  const [result] = await db
    .select({ maxVersion: max(applicationMaterials.version) })
    .from(applicationMaterials)
    .where(and(eq(applicationMaterials.applicationId, applicationId), eq(applicationMaterials.type, type)));

  return result?.maxVersion ? Number(result.maxVersion) : 0;
}

export async function listApplicationMaterials(userId: string, applicationId: string) {
  return db
    .select({
      material: applicationMaterials,
    })
    .from(applicationMaterials)
    .innerJoin(applications, eq(applicationMaterials.applicationId, applications.id))
    .where(and(eq(applicationMaterials.applicationId, applicationId), eq(applications.userId, userId)))
    .orderBy(desc(applicationMaterials.createdAt), desc(applicationMaterials.version));
}

export async function findApplicationMaterial(userId: string, applicationId: string, materialId: string) {
  const [result] = await db
    .select({
      material: applicationMaterials,
      application: applications,
    })
    .from(applicationMaterials)
    .innerJoin(applications, eq(applicationMaterials.applicationId, applications.id))
    .where(
      and(
        eq(applicationMaterials.id, materialId),
        eq(applicationMaterials.applicationId, applicationId),
        eq(applications.userId, userId),
      ),
    )
    .limit(1);

  return result;
}

export async function createApplicationMaterialRecord(values: {
  applicationId: string;
  type: MaterialType;
  version: number;
  content: string;
  structuredContent: Record<string, unknown>;
  sourceFacts: Record<string, unknown>;
  aiProvider?: string;
  aiModel?: string;
  promptVersion?: string;
  generationStatus?: "queued" | "processing" | "completed" | "failed";
  userReviewedAt?: Date | null;
}) {
  const id = randomUUID();
  const [record] = await db
    .insert(applicationMaterials)
    .values({
      id,
      applicationId: values.applicationId,
      type: values.type,
      version: values.version,
      content: values.content,
      structuredContent: values.structuredContent,
      sourceFacts: values.sourceFacts,
      generationStatus: values.generationStatus ?? "completed",
      aiProvider: values.aiProvider ?? "assistant-local",
      aiModel: values.aiModel ?? "v1",
      promptVersion: values.promptVersion ?? "v1",
      userReviewedAt: values.userReviewedAt ?? null,
    })
    .returning();

  return record;
}

export async function updateApplicationMaterialRecord(
  userId: string,
  applicationId: string,
  materialId: string,
  values: {
    content?: string;
    structuredContent?: Record<string, unknown>;
    userReviewedAt?: Date | null;
  },
) {
  const existing = await findApplicationMaterial(userId, applicationId, materialId);
  if (!existing) return null;

  const [updated] = await db
    .update(applicationMaterials)
    .set({
      content: values.content !== undefined ? values.content : existing.material.content,
      structuredContent:
        values.structuredContent !== undefined
          ? values.structuredContent
          : existing.material.structuredContent,
      userReviewedAt:
        values.userReviewedAt !== undefined
          ? values.userReviewedAt
          : existing.material.userReviewedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(applicationMaterials.id, materialId),
        eq(applicationMaterials.applicationId, applicationId),
      ),
    )
    .returning();

  return updated;
}
