import { describe, expect, it } from "vitest";

import { isRetryable, retryDelayMs } from "@/server/processing/contracts";

describe("background processing policy", () => {
  it("backs off exponentially and stops at the attempt limit", () => {
    expect(retryDelayMs(1)).toBe(1000);
    expect(retryDelayMs(3)).toBe(4000);
    expect(isRetryable(1, 3)).toBe(true);
    expect(isRetryable(3, 3)).toBe(false);
  });
});