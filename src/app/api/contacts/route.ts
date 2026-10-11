import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { createContactInput } from "@/server/contacts/contracts";
import { createContact, listContacts } from "@/server/contacts/repository";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });
  return NextResponse.json({ data: await listContacts(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });

  const parsed = createContactInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid contact." } }, { status: 422 });

  const [contact] = await createContact(session.user.id, parsed.data);
  return NextResponse.json({ data: contact }, { status: 201 });
}
