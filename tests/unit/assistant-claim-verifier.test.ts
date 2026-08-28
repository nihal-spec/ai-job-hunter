import { describe, expect, it } from "vitest";

import {
  verifyClaimsAgainstFacts,
  verifyCoverLetter,
  verifyScreeningAnswers,
  verifyTailoredResume,
} from "@/server/assistant/claim-verifier";
import type {
  CoverLetterStructured,
  ScreeningAnswersStructured,
  TailoredResumeStructured,
  VerifiedCandidateFacts,
} from "@/server/assistant/contracts";

const mockFacts: VerifiedCandidateFacts = {
  profileId: "prof-1",
  candidateName: "Jordan Lee",
  candidateEmail: "jordan@example.com",
  candidatePhone: "555-1234",
  locationText: "Seattle, WA",
  countryCode: "US",
  professionalSummary: "Backend engineer with PostgreSQL and Go expertise.",
  yearsExperience: 3,
  skills: [
    { name: "Go", normalizedName: "go", category: "backend", source: "resume", verified: true },
    { name: "PostgreSQL", normalizedName: "postgresql", category: "database", source: "resume", verified: true },
  ],
  experiences: [
    {
      organization: "Cloud Scale Inc",
      title: "Backend Engineer",
      startDate: "2021-01",
      endDate: "2024-01",
      isCurrent: false,
      highlights: ["Scaled database queries"],
      description: "Worked on distributed systems",
    },
  ],
  education: [],
  projects: [
    {
      name: "FastGo Microservice",
      role: "Creator",
      technologies: ["Go", "Docker"],
      highlights: [],
      description: "High throughput API service",
    },
  ],
  certifications: [],
  languages: [],
};

describe("assistant claim verifier", () => {
  it("validates truthful cover letters containing only verified skills", () => {
    const truthfulCoverLetter: CoverLetterStructured = {
      recipient: "Hiring Team",
      companyName: "TechCorp",
      jobTitle: "Go Developer",
      salutation: "Dear Hiring Team,",
      opening: "I am writing to apply for the Go Developer position.",
      bodyParagraphs: ["At Cloud Scale Inc, I worked with Go and PostgreSQL on high performance systems."],
      closing: "Thank you for your consideration.",
      signoff: "Sincerely,\nJordan Lee",
      citedFactIds: [],
      highlightedSkills: ["Go", "PostgreSQL"],
      fullText: "Dear Hiring Team,\nI worked at Cloud Scale Inc using Go and PostgreSQL for 3 years.",
    };

    const result = verifyCoverLetter(truthfulCoverLetter, mockFacts);
    expect(result.isValid).toBe(true);
    expect(result.truthfulnessScore).toBeGreaterThanOrEqual(80);
    expect(result.unverifiedClaims).toHaveLength(0);
  });

  it("flags hallucinated skills that are not in verified facts", () => {
    const hallucinatedCoverLetter: CoverLetterStructured = {
      recipient: "Hiring Team",
      companyName: "TechCorp",
      jobTitle: "Go Developer",
      salutation: "Dear Hiring Team,",
      opening: "I am applying for the role.",
      bodyParagraphs: ["I have extensive production experience with Rust and Kubernetes."],
      closing: "Thank you.",
      signoff: "Sincerely,\nJordan Lee",
      citedFactIds: [],
      highlightedSkills: ["Rust", "Kubernetes"],
      fullText: "I am an expert in Rust and Kubernetes.",
    };

    const result = verifyCoverLetter(hallucinatedCoverLetter, mockFacts);
    expect(result.isValid).toBe(false);
    expect(result.unverifiedClaims.length).toBeGreaterThanOrEqual(2);
    expect(result.unverifiedClaims.some((c) => c.includes("Rust"))).toBe(true);
  });

  it("flags exaggerated years of experience", () => {
    const exaggeratedText = "I bring 12 years of experience leading engineering teams.";
    const result = verifyClaimsAgainstFacts(exaggeratedText, mockFacts);

    expect(result.isValid).toBe(false);
    expect(result.unverifiedClaims.some((c) => c.includes("Claimed 12 years"))).toBe(true);
  });

  it("verifies tailored resume advice and flags unverified skill recommendations", () => {
    const truthfulResume: TailoredResumeStructured = {
      summaryRecommendation: "Highlight Go and PostgreSQL experience.",
      bulletSuggestions: [
        {
          section: "experience",
          itemTitle: "Backend Engineer at Cloud Scale Inc",
          originalFact: "Scaled database queries",
          suggestedBullet: "Optimized PostgreSQL indexes",
          reason: "Aligns with database performance requirements",
          alignedJobRequirement: "PostgreSQL",
        },
      ],
      skillsToEmphasize: ["Go", "PostgreSQL"],
      projectsToHighlight: ["FastGo Microservice"],
      verifiedQualificationsMatched: ["Go", "PostgreSQL"],
      potentialGapsToAddress: [],
      fullText: "Optimized PostgreSQL at Cloud Scale Inc",
    };

    const result = verifyTailoredResume(truthfulResume, mockFacts);
    expect(result.isValid).toBe(true);
    expect(result.unverifiedClaims).toHaveLength(0);

    const hallucinatedResume: TailoredResumeStructured = {
      ...truthfulResume,
      skillsToEmphasize: ["Solidity", "Blockchain"],
    };

    const badResult = verifyTailoredResume(hallucinatedResume, mockFacts);
    expect(badResult.isValid).toBe(false);
    expect(badResult.unverifiedClaims.length).toBe(2);
  });

  it("verifies screening answers", () => {
    const screening: ScreeningAnswersStructured = {
      answers: [
        {
          question: "How many years of experience do you have with Go?",
          suggestedAnswer: "I have approximately 3 years of verified experience building systems with Go.",
          keyEvidence: ["3 years verified experience"],
          sourceFactReferences: [],
        },
      ],
      fullText: "I have 3 years of verified experience with Go.",
    };

    const result = verifyScreeningAnswers(screening, mockFacts);
    expect(result.isValid).toBe(true);
    expect(result.unverifiedClaims).toHaveLength(0);
  });
});
