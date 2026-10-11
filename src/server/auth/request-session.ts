import { auth } from "@/server/auth";
import { findUserAccessStatus } from "@/server/admin/repository";

export function getRequestSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

/** Returns the session only if the caller is an active admin; otherwise null. Use for admin-only API routes. */
export async function getRequestAdminSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  const access = await findUserAccessStatus(session.user.id);
  if (access?.role !== "admin" || access.disabledAt) return null;
  return session;
}
