import { describe, expect, it } from "vitest";

import {
  ResumeValidationError,
  sanitizeDisplayName,
  validateResumeFile,
} from "@/server/resume/validation";

describe("resume upload validation", () => {
  it("accepts a PDF based on its file signature", async () => {
    await expect(validateResumeFile(Buffer.from("%PDF-1.7\nresume"), 100)).resolves.toBe(
      "application/pdf",
    );
  });

  it("rejects empty and oversized uploads", async () => {
    await expect(validateResumeFile(Buffer.alloc(0), 100)).rejects.toMatchObject({
      code: "EMPTY_FILE",
    } satisfies Partial<ResumeValidationError>);
    await expect(validateResumeFile(Buffer.alloc(101), 100)).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    } satisfies Partial<ResumeValidationError>);
  });

  it("removes path components and control characters from display names", () => {
    expect(sanitizeDisplayName("..\\private\u0000\\resume.pdf")).toBe("resume.pdf");
  });
});
