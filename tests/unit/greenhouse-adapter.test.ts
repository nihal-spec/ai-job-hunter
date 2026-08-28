import { describe, expect, it, vi } from "vitest";

import { JobSourceError } from "@/server/jobs/sources/contracts";
import { GreenhouseAdapter } from "@/server/jobs/sources/greenhouse";

const payload = {
  jobs: [
    {
      id: 42,
      title: "Frontend Engineer",
      location: { name: "Remote - India" },
      absolute_url: "https://boards.greenhouse.io/example/jobs/42",
      content: "<p>Build accessible React products &amp; APIs.</p>",
      updated_at: "2026-08-27T10:00:00Z",
      first_published: "2026-08-26T10:00:00Z",
    },
  ],
};

describe("GreenhouseAdapter", () => {
  it("fetches, validates, and normalizes public board jobs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const adapter = new GreenhouseAdapter("example", "Example Co", 1_000, fetcher);
    const [raw] = await adapter.fetchJobs();
    const job = adapter.normalizeJob(raw!);

    expect(fetcher).toHaveBeenCalledWith(
      "https://boards-api.greenhouse.io/v1/boards/example/jobs?content=true",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
    expect(job).toMatchObject({
      sourceJobId: "42",
      companyName: "Example Co",
      title: "Frontend Engineer",
      description: "Build accessible React products & APIs.",
    });
  });

  it("rejects malformed external responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ jobs: [{ id: 1 }] }), { status: 200 }));
    const adapter = new GreenhouseAdapter("example", "Example Co", 1_000, fetcher);
    await expect(adapter.fetchJobs()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("classifies timeout failures", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      );
    const adapter = new GreenhouseAdapter("example", "Example Co", 1_000, fetcher);
    const result = adapter.fetchJobs();
    const rejection = expect(result).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
    } satisfies Partial<JobSourceError>);
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    vi.useRealTimers();
  });

  it("rejects unsafe board identifiers", () => {
    expect(() => new GreenhouseAdapter("../private", "Example Co", 1_000)).toThrow(JobSourceError);
  });
});
