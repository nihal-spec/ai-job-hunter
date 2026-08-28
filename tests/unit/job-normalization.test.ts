import { describe, expect, it } from "vitest";

import { canonicalizeUrl, normalizeJob, normalizeText } from "@/server/jobs/normalization";

describe("job normalization", () => {
  it("normalizes comparison fields and strips tracking URL data", () => {
    const job = normalizeJob({
      sourceName: "Example Greenhouse",
      sourceJobId: "42",
      companyName: " Example Co ",
      title: " Frontend   Engineer ",
      locationText: " Remote - India ",
      description: "Build React products",
      applicationUrl: "https://EXAMPLE.com/jobs/42?utm_source=feed#details",
      publishedAt: null,
      sourceUpdatedAt: null,
      rawData: { id: 42 },
    });

    expect(job.companyNormalized).toBe("example co");
    expect(job.titleNormalized).toBe("frontend engineer");
    expect(job.locationNormalized).toBe("remote india");
    expect(job.canonicalApplicationUrl).toBe("https://example.com/jobs/42");
  });

  it("canonicalizes URLs deterministically", () => {
    expect(canonicalizeUrl("https://example.com/jobs/42/?ref=homepage")).toBe(
      "https://example.com/jobs/42",
    );
    expect(normalizeText("React & Next.js")).toBe("react next js");
  });

  it("rejects executable and credentialed application URLs", () => {
    expect(() => canonicalizeUrl("javascript:alert(1)")).toThrow("UNSAFE_APPLICATION_URL");
    expect(() => canonicalizeUrl("https://user:password@example.com/jobs/42")).toThrow(
      "UNSAFE_APPLICATION_URL",
    );
  });
});
