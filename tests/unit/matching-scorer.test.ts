import { describe, expect, it } from "vitest";

import { defaultMatchWeights, type MatchInput } from "@/server/matching/contracts";
import { scoreMatch } from "@/server/matching/scorer";

function input(overrides: Partial<MatchInput> = {}): MatchInput {
  return {
    candidate: {
      skills: [{ name: "React", verified: true, source: "resume" }],
      yearsExperience: 2,
      experienceText: ["Built React applications and REST APIs"],
      educationCount: 1,
    },
    job: {
      title: "Frontend Developer",
      companyName: "Example",
      description: "Build React applications",
      responsibilities: ["Build React applications"],
      skills: [
        { name: "React", required: true },
        { name: "AWS", required: false },
      ],
      experienceMinYears: 1,
      experienceMaxYears: 3,
      locationText: "Remote India",
      workplaceMode: "remote",
      employmentType: "full-time",
    },
    preferences: {
      roles: ["Frontend Developer"],
      locations: ["India"],
      workplaceModes: ["remote"],
      employmentTypes: ["full-time"],
      excludedKeywords: [],
      preferredCompanies: [],
      preferredSkills: ["React"],
      weights: defaultMatchWeights,
    },
    ...overrides,
  };
}

describe("deterministic matching", () => {
  it("produces evidence-backed component scores", () => {
    const result = scoreMatch(input());
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.evidence.matchedSkills).toEqual(["React"]);
    expect(result.evidence.missingPreferredSkills).toEqual(["AWS"]);
    expect(result.recommendation).toContain("internal recommendation score");
  });

  it("gives inferred skills less credit than verified skills", () => {
    const verified = scoreMatch(input());
    const inferred = scoreMatch(
      input({
        candidate: {
          skills: [{ name: "React", verified: false, source: "ai_inference" }],
          yearsExperience: 2,
          experienceText: [],
          educationCount: 1,
        },
      }),
    );
    expect(inferred.components.skills).toBeLessThan(verified.components.skills);
    expect(inferred.evidence.partialSkills).toEqual(["React"]);
  });

  it("caps excluded jobs at a low recommendation", () => {
    const result = scoreMatch(
      input({ preferences: { ...input().preferences, excludedKeywords: ["frontend"] } }),
    );
    expect(result.disqualified).toBe(true);
    expect(result.overallScore).toBeLessThanOrEqual(20);
  });

  it("treats missing experience and location data as unknown, not failure", () => {
    const result = scoreMatch(
      input({
        candidate: { ...input().candidate, yearsExperience: null },
        job: { ...input().job, locationText: null },
      }),
    );
    expect(result.components.experience).toBe(50);
    expect(result.components.location).toBe(50);
  });
});
