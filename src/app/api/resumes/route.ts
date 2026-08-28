import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { getUserResumes, ResumeLimitError, uploadResume } from "@/server/resume/service";
import { ResumeValidationError } from "@/server/resume/validation";

export async function GET(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );

  return NextResponse.json({ data: await getUserResumes(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getRequestSession(request.headers);
  if (!session)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "FILE_REQUIRED", message: "Choose a resume to upload." } },
        { status: 400 },
      );
    }

    const resume = await uploadResume(session.user.id, file);
    return NextResponse.json({ data: resume }, { status: 201 });
  } catch (error) {
    if (error instanceof ResumeValidationError) {
      const status =
        error.code === "FILE_TOO_LARGE" ? 413 : error.code === "UNSUPPORTED_FILE_TYPE" ? 415 : 422;
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
    }
    if (error instanceof ResumeLimitError) {
      return NextResponse.json(
        { error: { code: "UPLOAD_LIMIT", message: error.message } },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "We could not process your resume." } },
      { status: 500 },
    );
  }
}
