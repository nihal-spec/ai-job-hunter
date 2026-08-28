import { describe, expect, it } from "vitest";

import { extractResumeText, ResumeExtractionError } from "@/server/resume/extractor";

describe("resume text extraction", () => {
  it("returns a safe error for an invalid document", async () => {
    await expect(
      extractResumeText(Buffer.from("not a document"), "application/pdf"),
    ).rejects.toBeInstanceOf(ResumeExtractionError);
  });
});
