import { env } from "@/env";
import { describe, expect, it } from "vitest";

describe("Phase 1 foundation", () => {
  it("provides safe local environment defaults", () => {
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(["development", "test", "production"]).toContain(env.NODE_ENV);
  });
});
