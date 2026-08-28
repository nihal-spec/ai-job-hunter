import type { SourceJob } from "@/server/jobs/sources/contracts";
import { createJobSourceRegistry } from "@/server/jobs/sources/configuration";

export type SourceDiscoveryResult = {
  source: string;
  jobs: SourceJob[];
};

export async function discoverConfiguredJobs(
  signal?: AbortSignal,
): Promise<SourceDiscoveryResult[]> {
  const registry = createJobSourceRegistry();
  return Promise.all(
    registry.enabled().map(async (adapter) => {
      const rawJobs = await adapter.fetchJobs({ signal });
      return {
        source: adapter.configuration.slug,
        jobs: rawJobs.map((rawJob) => adapter.normalizeJob(rawJob)),
      };
    }),
  );
}
