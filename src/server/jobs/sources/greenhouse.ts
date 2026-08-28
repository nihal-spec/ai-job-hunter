import { z } from "zod";

import type {
  FetchJobsContext,
  JobSourceAdapter,
  SourceConfiguration,
  SourceJob,
} from "@/server/jobs/sources/contracts";
import { JobSourceError } from "@/server/jobs/sources/contracts";

const boardToken = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const greenhouseJob = z
  .object({
    id: z.union([z.string(), z.number()]),
    title: z.string().min(1),
    location: z.object({ name: z.string().default("") }),
    absolute_url: z.url({ protocol: /^https?$/ }),
    content: z.string().default(""),
    updated_at: z.iso.datetime({ offset: true }).nullable().optional(),
    first_published: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .loose();

const greenhouseResponse = z.object({ jobs: z.array(greenhouseJob) });
export type GreenhouseJob = z.infer<typeof greenhouseJob>;

function textFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export class GreenhouseAdapter implements JobSourceAdapter<GreenhouseJob> {
  readonly configuration: SourceConfiguration;

  constructor(
    readonly board: string,
    private readonly companyName: string,
    private readonly requestTimeoutMs: number,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!boardToken.safeParse(board).success) {
      throw new JobSourceError("INVALID_CONFIGURATION", "Invalid Greenhouse board token.");
    }
    this.configuration = {
      slug: `greenhouse-${board.toLowerCase()}`,
      name: `${companyName} Greenhouse`,
      adapterType: "greenhouse",
      enabled: true,
    };
  }

  getSourceName() {
    return this.configuration.name;
  }

  getApplicationUrl(rawJob: GreenhouseJob) {
    return rawJob.absolute_url;
  }

  async fetchJobs(context: FetchJobsContext = {}) {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), this.requestTimeoutMs);
    const signal = context.signal
      ? AbortSignal.any([context.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await this.fetcher(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.board)}/jobs?content=true`,
        { headers: { accept: "application/json" }, signal },
      );
      if (!response.ok) {
        throw new JobSourceError("REQUEST_FAILED", `Greenhouse returned HTTP ${response.status}.`);
      }
      const parsed = greenhouseResponse.safeParse(await response.json());
      if (!parsed.success) {
        throw new JobSourceError("INVALID_RESPONSE", "Greenhouse returned an unexpected response.");
      }
      return parsed.data.jobs;
    } catch (error) {
      if (error instanceof JobSourceError) throw error;
      if (signal.aborted) {
        throw new JobSourceError("REQUEST_TIMEOUT", "Greenhouse request timed out.", {
          cause: error,
        });
      }
      throw new JobSourceError("REQUEST_FAILED", "Greenhouse request failed.", { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }

  normalizeJob(rawJob: GreenhouseJob): SourceJob {
    const updatedAt = rawJob.updated_at ? new Date(rawJob.updated_at) : null;
    return {
      sourceName: this.getSourceName(),
      sourceJobId: String(rawJob.id),
      companyName: this.companyName,
      title: rawJob.title.trim(),
      locationText: rawJob.location.name.trim() || null,
      description: textFromHtml(rawJob.content),
      applicationUrl: this.getApplicationUrl(rawJob),
      publishedAt: rawJob.first_published ? new Date(rawJob.first_published) : null,
      sourceUpdatedAt: updatedAt,
      rawData: rawJob,
    };
  }
}
