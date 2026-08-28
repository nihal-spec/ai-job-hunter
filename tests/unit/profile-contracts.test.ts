import { describe, expect, it } from "vitest";

import { profileInput } from "@/server/profile/contracts";

describe("candidate profile contract", () => {
  it("normalizes country codes and defaults child collections", () => {
    const result = profileInput.parse({ countryCode: "in" });
    expect(result.countryCode).toBe("IN");
    expect(result.skills).toEqual([]);
    expect(result.experiences).toEqual([]);
  });

  it("rejects invalid experience and untrusted links", () => {
    expect(profileInput.safeParse({ yearsExperience: -1 }).success).toBe(false);
    expect(
      profileInput.safeParse({ links: [{ type: "portfolio", url: "javascript:alert(1)" }] })
        .success,
    ).toBe(false);
  });

  it("bounds profile collections", () => {
    const skills = Array.from({ length: 101 }, (_, index) => ({
      name: `Skill ${index}`,
      category: "technical",
    }));
    expect(profileInput.safeParse({ skills }).success).toBe(false);
  });
});
