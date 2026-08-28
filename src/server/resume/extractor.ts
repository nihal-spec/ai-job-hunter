import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import type { AcceptedResumeType } from "@/server/resume/validation";

export class ResumeExtractionError extends Error {
  constructor(readonly code: "CORRUPT_DOCUMENT" | "EMPTY_TEXT") {
    super(
      code === "EMPTY_TEXT" ? "No readable text was found." : "The document could not be read.",
    );
  }
}

function cleanText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(buffer: Buffer, mediaType: AcceptedResumeType) {
  try {
    let text: string;

    if (mediaType === "application/pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else {
      text = (await mammoth.extractRawText({ buffer })).value;
    }

    const cleaned = cleanText(text);
    if (!cleaned) throw new ResumeExtractionError("EMPTY_TEXT");
    return cleaned;
  } catch (error) {
    if (error instanceof ResumeExtractionError) throw error;
    throw new ResumeExtractionError("CORRUPT_DOCUMENT");
  }
}
