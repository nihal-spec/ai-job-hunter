ALTER TABLE "processing_jobs" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "processing_jobs_idempotency_idx" ON "processing_jobs" USING btree ("idempotency_key");