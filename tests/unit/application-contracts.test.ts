import { describe, expect, it } from "vitest";

import { canTransition, createApplicationInput } from "@/server/applications/contracts";

describe("application lifecycle", () => {
  it("allows forward progress and rejects invalid transitions", () => {
    expect(canTransition("applying", "applied")).toBe(true);
    expect(canTransition("rejected", "interview")).toBe(false);
  });

  it("validates application payloads", () => {
    expect(createApplicationInput.safeParse({ jobId: "not-an-id" }).success).toBe(false);
    expect(
      createApplicationInput.safeParse({ jobId: "00000000-0000-4000-8000-000000000001" }).success,
    ).toBe(true);
  });
});
