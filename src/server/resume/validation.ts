import { fileTypeFromBuffer } from "file-type";

export const acceptedResumeTypes = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type AcceptedResumeType = keyof typeof acceptedResumeTypes;

export class ResumeValidationError extends Error {
  constructor(
    message: string,
    readonly code: "EMPTY_FILE" | "FILE_TOO_LARGE" | "UNSUPPORTED_FILE_TYPE",
  ) {
    super(message);
  }
}

export async function validateResumeFile(buffer: Buffer, maxBytes: number) {
  if (buffer.byteLength === 0) {
    throw new ResumeValidationError("The uploaded file is empty.", "EMPTY_FILE");
  }

  if (buffer.byteLength > maxBytes) {
    throw new ResumeValidationError("The uploaded file is too large.", "FILE_TOO_LARGE");
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !(detected.mime in acceptedResumeTypes)) {
    throw new ResumeValidationError(
      "Only valid PDF and DOCX files are accepted.",
      "UNSUPPORTED_FILE_TYPE",
    );
  }

  return detected.mime as AcceptedResumeType;
}

export function sanitizeDisplayName(fileName: string) {
  const leafName = fileName.replaceAll("\\", "/").split("/").at(-1) ?? "resume";
  return leafName.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255) || "resume";
}
