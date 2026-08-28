import { describe, expect, it } from "vitest";

import {
  generateCoverLetterContent,
  generateScreeningAnswersContent,
  generateTailoredResumeRecommendationsContent,
} from "@/server/assistant/generator";
import type { Job } from "@/server/db/schema";
import type { VerifiedCandidateFacts } from "@/server/assistant/contracts";

const mockJob: Job = {
  id: "job-1",
  companyName: "Acme Analytics",
  companyNormalized: "acme analytics",
  title: "Frontend Engineer",
  titleNormalized: "frontend engineer",
  description: "We are looking for a React developer with TypeScript experience to build dashboards.",
  responsibilities: ["Build responsive React dashboards", "Collaborate with product designers"],
  requirements: ["React", "TypeScript", "3+ years experience", "GraphQL"],
  skills: ["React", "TypeScript", "Tailwind CSS"],
  locationText: "Remote",
  locationNormalized: "remote",
  countryCode: "US",
  workplaceMode: "remote",
  employmentType: "full_time",
  experienceMinYears: "2",
  experienceMaxYears: "5",
  salaryMin: "100000.00",
  salaryMax: "130000.00",
  salaryCurrency: "USD",
  canonicalApplicationUrl: "https://example.com/apply",
  publishedAt: new Date(),
  expiresAt: null,
  status: "active",
  normalizationVersion: "v1",
  contentHash: "hash-123",
  embedding: null,
  embeddingModel: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFacts: VerifiedCandidateFacts = {
  profileId: "prof-1",
  candidateName: "Sam Taylor",
  candidateEmail: "sam@example.com",
  candidatePhone: "555-9876",
  locationText: "Austin, TX",
  countryCode: "US",
  professionalSummary: "Frontend specialist with deep React experience.",
  yearsExperience: 4,
  skills: [
    { id: "s1", name: "React", normalizedName: "react", category: "frontend", source: "resume", verified: true },
    { id: "s2", name: "TypeScript", normalizedName: "typescript", category: "languages", source: "resume", verified: true },
    { id: "s3", name: "CSS", normalizedName: "css", category: "frontend", source: "resume", verified: true },
  ],
  experiences: [
    {
      id: "e1",
      organization: "WebCorp",
      title: "UI Developer",
      locationText: "Austin, TX",
      startDate: "2021-01",
      endDate: "2024-01",
      isCurrent: false,
      description: "Built scalable web interfaces with React and TypeScript.",
      highlights: ["Spearheaded design system adoption across 5 teams"],
    },
  ],
  education: [],
  projects: [
    {
      id: "p1",
      name: "Analytics Dashboard UI",
      description: "Interactive dashboard featuring real-time data charts.",
      role: "Lead Frontend Engineer",
      url: "https://github.com/sam/analytics-ui",
      startDate: "2023-01",
      endDate: null,
      highlights: ["Rendered 50k datapoints with 60fps performance"],
      technologies: ["React", "TypeScript", "D3"],
    },
  ],
  certifications: [],
  languages: [],
};

describe("assistant generation engine", () => {
  it("generates structured truthful cover letter tailored to job", () => {
    const coverLetter = generateCoverLetterContent(mockFacts, mockJob, { tone: "professional" });

    expect(coverLetter.companyName).toBe("Acme Analytics");
    expect(coverLetter.jobTitle).toBe("Frontend Engineer");
    expect(coverLetter.salutation).toContain("Acme Analytics");
    expect(coverLetter.signoff).toContain("Sam Taylor");
    expect(coverLetter.opening).toContain("Frontend Engineer");
    expect(coverLetter.highlightedSkills).toContain("React");
    expect(coverLetter.highlightedSkills).toContain("TypeScript");
    expect(coverLetter.bodyParagraphs.length).toBeGreaterThanOrEqual(2);
    expect(coverLetter.fullText).toContain("WebCorp");
    expect(coverLetter.fullText).toContain("Analytics Dashboard UI");
    expect(coverLetter.citedFactIds.length).toBeGreaterThan(0);
  });

  it("generates tailored resume advice identifying matching skills and gap guidance", () => {
    const advice = generateTailoredResumeRecommendationsContent(mockFacts, mockJob);

    expect(advice.skillsToEmphasize).toContain("React");
    expect(advice.skillsToEmphasize).toContain("TypeScript");
    expect(advice.projectsToHighlight).toContain("Analytics Dashboard UI");
    expect(advice.bulletSuggestions.length).toBeGreaterThan(0);
    expect(advice.bulletSuggestions[0].suggestedBullet).toBeDefined();
    expect(advice.potentialGapsToAddress.some((g) => g.includes("GraphQL"))).toBe(true);
    expect(advice.fullText).toContain("Tailored Resume Optimization");
  });

  it("generates concise screening answers based on verified facts", () => {
    const screening = generateScreeningAnswersContent(mockFacts, mockJob, {
      questions: [
        "How many years of experience do you have in software development?",
        "Are you legally authorized to work in the US?",
        "Tell us about a frontend project you built.",
      ],
    });

    expect(screening.answers).toHaveLength(3);
    expect(screening.answers[0].suggestedAnswer).toContain("4 years");
    expect(screening.answers[1].suggestedAnswer).toContain("authorized to work");
    expect(screening.answers[2].suggestedAnswer).toContain("Analytics Dashboard UI");
    expect(screening.answers[2].sourceFactReferences).toContain("p1");
  });
});
