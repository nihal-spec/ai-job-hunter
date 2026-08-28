import { NextResponse } from "next/server";

import { env } from "@/env";

export function proxy(request: Request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return NextResponse.next();
  const origin = request.headers.get("origin");
  if (!origin || origin === env.APP_URL) return NextResponse.next();
  return NextResponse.json(
    { error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed." } },
    { status: 403 },
  );
}

export const config = { matcher: ["/api/:path*"] };