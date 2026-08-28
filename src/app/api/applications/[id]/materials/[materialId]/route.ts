import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth/request-session";
import { updateMaterialInputSchema } from "@/server/assistant/contracts";
import { updateMaterial } from "@/server/assistant/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; materialId: string }> },
) {
  const session = await getRequestSession(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = updateMaterialInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid material update payload." } },
      { status: 422 },
    );
  }

  const { id: applicationId, materialId } = await context.params;
  const result = await updateMaterial(session.user.id, applicationId, materialId, parsed.data);

  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Material not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: result.material });
}
