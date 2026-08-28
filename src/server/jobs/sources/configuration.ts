import { env } from "@/env";
import { GreenhouseAdapter } from "@/server/jobs/sources/greenhouse";
import { JobSourceRegistry } from "@/server/jobs/sources/registry";

export function createJobSourceRegistry(fetcher: typeof fetch = fetch) {
  const registry = new JobSourceRegistry();
  if (!env.JOB_SOURCE_GREENHOUSE_ENABLED) return registry;

  for (const board of env.JOB_SOURCE_GREENHOUSE_BOARDS) {
    registry.register(
      new GreenhouseAdapter(board, board, env.JOB_SOURCE_REQUEST_TIMEOUT_MS, fetcher),
    );
  }
  return registry;
}
