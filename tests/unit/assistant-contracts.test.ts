import { describe, expect, it } from "vitest";

import {
  coverLetterStructuredSchema,
  generateCoverLetterInputSchema,
  generateScreeningAnswersInputSchema,
  generateTailoredResumeInputSchema,
  materialTypeSchema,
  screeningAnswersStructuredSchema,
  tailoredResumeStructuredSchema,
  updateMaterialInputSchema,
} from "@/server/assistant/contracts";

describe("assistant contracts validation", () => {
  it("validates material types", () => {
    expect(materialTypeSchema.safeParse("cover_letter").success).toBe(true);
    expect(materialTypeSchema.safeParse("tailored_resume_recommendations").success).toBe(true);
    expect(materialTypeSchema.safeParse("screening_answers").success).toBe(true);
    expect(materialTypeSchema.safeParse("invalid_type").success).toBe(false);
  });

  it("validates generate cover letter inputs", () => {
    expect(generateCoverLetterInputSchema.safeParse({ tone: "professional" }).success).toBe(true);
    expect(generateCoverLetterInputSchema.safeParse({ tone: "invalid_tone" }).success).toBe(false);
  });

  it("validates generate tailored resume inputs", () => {
    expect(generateTailoredResumeInputSchema.safeParse({ focusArea: "backend" }).success).toBe(true);
    expect(generateTailoredResumeInputSchema.safeParse({}).success).toBe(true);
  });

  it("validates generate screening answers inputs", () => {
    expect(generateScreeningAnswersInputSchema.safeParse({ questions: ["Why this company?"] }).success).toBe(true);
    expect(generateScreeningAnswersInputSchema.safeParse({ questions: [] }).success).toBe(false);
  });

  it("validates update material inputs", () => {
    expect(updateMaterialInputSchema.safeParse({ content: "Updated content", markReviewed: true }).success).toBe(true);
    expect(updateMaterialInputSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("validates structured outputs", () => {
    const validCoverLetter = {
      recipient: "Hiring Team",
      companyName: "Acme",
      jobTitle: "Developer",
      salutation: "Hello",
      opening: "Applying for job",
      bodyParagraphs: ["Paragraph 1"],
      closing: "Thank you",
      signoff: "Sincerely",
      citedFactIds: ["f1"],
      highlightedSkills: ["React"],
      fullText: "Full text",
    };
    expect(coverLetterStructuredSchema.safeParse(validCoverLetter).success).toBe(true);

    const validResumeAdvice = {
      summaryRecommendation: "Focus on React",
      bulletSuggestions: [],
      skillsToEmphasize: ["React"],
      projectsToHighlight: ["Project 1"],
      verifiedQualificationsMatched: [],
      potentialGapsToAddress: [],
      fullText: "Advice text",
    };
    expect(tailoredResumeStructuredSchema.safeParse(validResumeAdvice).success).toBe(true);

    const validScreening = {
      answers: [
        {
          question: "Tell us about yourself",
          suggestedAnswer: "I am a developer",
          keyEvidence: ["5 years"],
          sourceFactReferences: [],
        },
      ],
      fullText: "Screening text",
    };
    expect(screeningAnswersStructuredSchema.safeParse(validScreening).success).toBe(true);
  });
});
