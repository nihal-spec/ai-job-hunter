import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { parseJobSearch } from "@/server/jobs/query";
import { searchJobs } from "@/server/jobs/repository";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  const parsed = parseJobSearch(new URL(request.url).searchParams);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid job filters." } },
      { status: 422 },
    );
  return NextResponse.json({ data: await searchJobs(session.user.id, parsed.data) });
}
