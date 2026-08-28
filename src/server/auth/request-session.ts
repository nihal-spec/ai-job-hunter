import { auth } from "@/server/auth";

export function getRequestSession(headers: Headers) {
  return auth.api.getSession({ headers });
}
