import { NextResponse } from "next/server";

import { analyticsDateRange } from "@/server/analytics/contracts";
import { getDashboardAnalytics } from "@/server/analytics/service";
import { getRequestSession } from "@/server/auth/request-session";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, { status: 401 });
  const url = new URL(request.url);
  const parsed = analyticsDateRange.safeParse({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
  if (!parsed.success || (parsed.data.from && parsed.data.to && parsed.data.from >= parsed.data.to)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Use a valid date range." } }, { status: 422 });
  return NextResponse.json({ data: await getDashboardAnalytics(session.user.id, parsed.data) });
}