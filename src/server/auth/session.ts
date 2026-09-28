import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { findUserAccessStatus } from "@/server/admin/repository";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const access = await findUserAccessStatus(session.user.id);
  if (access?.disabledAt) {
    redirect("/sign-in?disabled=1");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  const access = await findUserAccessStatus(session.user.id);
  if (access?.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}
