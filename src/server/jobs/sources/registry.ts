import type { JobSourceAdapter } from "@/server/jobs/sources/contracts";

export class JobSourceRegistry {
  private readonly adapters = new Map<string, JobSourceAdapter<Record<string, unknown>>>();

  register(adapter: JobSourceAdapter<Record<string, unknown>>) {
    if (this.adapters.has(adapter.configuration.slug)) {
      throw new Error(`Job source already registered: ${adapter.configuration.slug}`);
    }
    this.adapters.set(adapter.configuration.slug, adapter);
    return this;
  }

  get(slug: string) {
    return this.adapters.get(slug);
  }

  enabled() {
    return [...this.adapters.values()].filter((adapter) => adapter.configuration.enabled);
  }
}
