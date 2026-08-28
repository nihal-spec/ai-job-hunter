import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { gmailConnections } from "@/server/db/schema";

export function findGmailConnection(userId: string) {
  return db.select().from(gmailConnections).where(eq(gmailConnections.userId, userId)).limit(1);
}

export function saveGmailConnection(userId: string, values: Omit<typeof gmailConnections.$inferInsert, "userId">) {
  return db
    .insert(gmailConnections)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: gmailConnections.userId, set: { ...values, updatedAt: new Date() } })
    .returning();
}

export function deleteGmailConnection(userId: string) {
  return db.delete(gmailConnections).where(and(eq(gmailConnections.userId, userId))).returning({ id: gmailConnections.id });
}