import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";
import type { CreateContactInput } from "@/server/contacts/contracts";

export function createContact(userId: string, input: CreateContactInput) {
  return db
    .insert(contacts)
    .values({
      id: randomUUID(),
      userId,
      jobId: input.jobId ?? null,
      company: input.company,
      name: input.name ?? null,
      role: input.role ?? null,
      email: input.email ?? null,
      source: "user",
    })
    .returning();
}

export function listContacts(userId: string) {
  return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
}

export async function findContact(id: string, userId: string) {
  const [row] = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId))).limit(1);
  return row;
}
