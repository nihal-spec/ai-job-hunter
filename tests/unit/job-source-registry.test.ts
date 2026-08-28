import { describe, expect, it } from "vitest";

import type { JobSourceAdapter } from "@/server/jobs/sources/contracts";
import { JobSourceRegistry } from "@/server/jobs/sources/registry";

function adapter(slug: string, enabled: boolean): JobSourceAdapter<Record<string, unknown>> {
  return {
    configuration: { slug, name: slug, adapterType: "test", enabled },
    fetchJobs: async () => [],
    normalizeJob: () => {
      throw new Error("unused");
    },
    getSourceName: () => slug,
    getApplicationUrl: () => "https://example.com",
  };
}

describe("JobSourceRegistry", () => {
  it("returns only enabled adapters", () => {
    const registry = new JobSourceRegistry()
      .register(adapter("enabled", true))
      .register(adapter("disabled", false));
    expect(registry.enabled().map((source) => source.configuration.slug)).toEqual(["enabled"]);
  });

  it("rejects duplicate source slugs", () => {
    const registry = new JobSourceRegistry().register(adapter("duplicate", true));
    expect(() => registry.register(adapter("duplicate", true))).toThrow("already registered");
  });
});
