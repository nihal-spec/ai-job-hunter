import { randomUUID } from "node:crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Minimal structured JSON logger. Deliberately dependency-free (no pino/winston) so it works
 * without an install step; swap the `write` function for a real sink (e.g. an OpenTelemetry
 * exporter, or `@sentry/nextjs`'s `captureException` on the "error" level) once one is added.
 * Never pass resumes, tokens, prompts, or other sensitive payloads in `fields` — see
 * PROJECT_SPEC.md §24.
 */
function write(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields),
};

export function newRequestId() {
  return randomUUID();
}
