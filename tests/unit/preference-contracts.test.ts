import { describe, expect, it } from "vitest";

import { preferenceInput } from "@/server/preferences/contracts";

describe("job preference contract", () => {
  it("applies matching defaults and normalizes currency", () => {
    const result = preferenceInput.parse({ name: "Frontend", salaryCurrency: "inr" });
    expect(result.salaryCurrency).toBe("INR");
    expect(Object.values(result.scoringWeights).reduce((sum, weight) => sum + weight, 0)).toBe(1);
  });

  it("rejects scoring weights that do not total one", () => {
    const result = preferenceInput.safeParse({
      name: "Frontend",
      scoringWeights: {
        skills: 0.5,
        experience: 0.5,
        responsibilities: 0.5,
        preferences: 0,
        location: 0,
        education: 0,
        other: 0,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid salary and experience constraints", () => {
    expect(preferenceInput.safeParse({ name: "Search", minSalary: -1 }).success).toBe(false);
    expect(preferenceInput.safeParse({ name: "Search", maxExperienceYears: 100 }).success).toBe(
      false,
    );
  });
});
