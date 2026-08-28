import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "@/env";
import * as schema from "@/server/db/schema";

const databaseUrl =
  env.DATABASE_URL ?? "postgresql://jobhunter:jobhunter@localhost:5432/ai_job_hunter";

const client = postgres(databaseUrl, { prepare: false });

export const db = drizzle(client, { schema });
