import { describe, expect, it } from "vitest";

import { decodeJobCursor, encodeJobCursor, parseJobSearch } from "@/server/jobs/query";

describe("job discovery query", () => {
  it("validates bounded filters and round-trips cursors", () => {
    const parsed = parseJobSearch(new URLSearchParams("q=React&location=India&limit=10"));
    expect(parsed.success).toBe(true);
    const id = "00000000-0000-4000-8000-000000000001";
    const cursor = encodeJobCursor(new Date("2026-08-27T00:00:00.000Z"), id);
    expect(decodeJobCursor(cursor)).toMatchObject({ id });
  });

  it("rejects unsupported workplace values and excessive limits", () => {
    expect(parseJobSearch(new URLSearchParams("workplaceMode=unknown")).success).toBe(false);
    expect(parseJobSearch(new URLSearchParams("limit=1000")).success).toBe(false);
  });
});
