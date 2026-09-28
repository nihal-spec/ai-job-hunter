import { NextResponse } from "next/server";

import { getRequestAdminSession } from "@/server/auth/request-session";
import { requeueProcessingJob } from "@/server/admin/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestAdminSession(request.headers);
  if (!session) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, { status: 403 });

  const { id } = await context.params;
  const [updated] = await requeueProcessingJob(id);
  if (!updated) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
  return NextResponse.json({ data: updated });
}
