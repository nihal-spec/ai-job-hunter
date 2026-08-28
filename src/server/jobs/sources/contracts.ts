export type SourceConfiguration = {
  slug: string;
  name: string;
  adapterType: string;
  enabled: boolean;
};

export type FetchJobsContext = {
  signal?: AbortSignal;
};

export type SourceJob = {
  sourceName: string;
  sourceJobId: string;
  companyName: string;
  title: string;
  locationText: string | null;
  description: string;
  applicationUrl: string;
  publishedAt: Date | null;
  sourceUpdatedAt: Date | null;
  rawData: Record<string, unknown>;
};

export interface JobSourceAdapter<TRaw extends Record<string, unknown>> {
  readonly configuration: SourceConfiguration;
  fetchJobs(context?: FetchJobsContext): Promise<TRaw[]>;
  normalizeJob(rawJob: TRaw): SourceJob;
  getSourceName(): string;
  getApplicationUrl(rawJob: TRaw): string;
}

export class JobSourceError extends Error {
  constructor(
    readonly code:
      "INVALID_CONFIGURATION" | "REQUEST_FAILED" | "REQUEST_TIMEOUT" | "INVALID_RESPONSE",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
