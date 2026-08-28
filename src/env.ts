import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url().optional(),
  AUTH_SECRET: z.string().min(32).default("development-only-auth-secret-change-me"),
  RESUME_STORAGE_PATH: z.string().min(1).default(".data/resumes"),
  RESUME_MAX_FILE_BYTES: z.coerce.number().int().positive().default(5_242_880),
  RESUME_MAX_FILES_PER_USER: z.coerce.number().int().positive().default(10),
  JOB_SOURCE_GREENHOUSE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  JOB_SOURCE_GREENHOUSE_BOARDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((board) => board.trim())
        .filter(Boolean),
    ),
  JOB_SOURCE_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
  CRON_SECRET: z.string().min(32).default("development-only-cron-secret-change-me"),
  WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  WORKER_LEASE_SECONDS: z.coerce.number().int().min(10).max(86_400).default(300),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.url().default("http://localhost:3000/api/gmail/callback"),
});

export const env = environmentSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  RESUME_STORAGE_PATH: process.env.RESUME_STORAGE_PATH,
  RESUME_MAX_FILE_BYTES: process.env.RESUME_MAX_FILE_BYTES,
  RESUME_MAX_FILES_PER_USER: process.env.RESUME_MAX_FILES_PER_USER,
  JOB_SOURCE_GREENHOUSE_ENABLED: process.env.JOB_SOURCE_GREENHOUSE_ENABLED,
  JOB_SOURCE_GREENHOUSE_BOARDS: process.env.JOB_SOURCE_GREENHOUSE_BOARDS,
  JOB_SOURCE_REQUEST_TIMEOUT_MS: process.env.JOB_SOURCE_REQUEST_TIMEOUT_MS,
  CRON_SECRET: process.env.CRON_SECRET,
  WORKER_BATCH_SIZE: process.env.WORKER_BATCH_SIZE,
  WORKER_LEASE_SECONDS: process.env.WORKER_LEASE_SECONDS,
  WORKER_MAX_ATTEMPTS: process.env.WORKER_MAX_ATTEMPTS,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
});

export type Environment = typeof env;
