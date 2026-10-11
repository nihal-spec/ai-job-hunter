CREATE TYPE "public"."contact_source" AS ENUM('job_posting', 'company_info', 'user');--> statement-breakpoint
CREATE TYPE "public"."email_category" AS ENUM('application_confirmation', 'interview_invitation', 'assessment', 'rejection', 'offer', 'recruiter_message', 'application_follow_up', 'other');--> statement-breakpoint
CREATE TYPE "public"."email_match_status" AS ENUM('unmatched', 'pending_confirmation', 'matched', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."outreach_response_category" AS ENUM('positive', 'negative', 'neutral', 'request_for_information', 'interview', 'other');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('draft', 'ready', 'sent', 'replied', 'follow_up', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"company" text NOT NULL,
	"name" text,
	"role" text,
	"email" text,
	"source" "contact_source" NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"thread_id" uuid,
	"provider_message_id" text NOT NULL,
	"sender" text NOT NULL,
	"recipient" text,
	"subject" text,
	"snippet" text,
	"body_text" text,
	"received_at" timestamp with time zone NOT NULL,
	"classification" "email_category",
	"classification_confidence" numeric(4, 3),
	"application_id" uuid,
	"match_status" "email_match_status" DEFAULT 'unmatched' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"subject" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outreach_id" uuid NOT NULL,
	"type" text NOT NULL,
	"response_category" "outreach_response_category",
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"job_id" uuid,
	"application_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "outreach_status" DEFAULT 'draft' NOT NULL,
	"follow_up_count" integer DEFAULT 0 NOT NULL,
	"max_follow_ups" integer DEFAULT 1 NOT NULL,
	"source_facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_provider" text,
	"ai_model" text,
	"prompt_version" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_events" ADD CONSTRAINT "outreach_events_outreach_id_outreach_messages_id_fk" FOREIGN KEY ("outreach_id") REFERENCES "public"."outreach_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_user_created_idx" ON "contacts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_user_provider_idx" ON "email_messages" USING btree ("user_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "email_messages_user_received_idx" ON "email_messages" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "email_messages_application_idx" ON "email_messages" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_threads_user_thread_idx" ON "email_threads" USING btree ("user_id","gmail_thread_id");--> statement-breakpoint
CREATE INDEX "outreach_events_outreach_idx" ON "outreach_events" USING btree ("outreach_id","occurred_at");--> statement-breakpoint
CREATE INDEX "outreach_messages_user_status_idx" ON "outreach_messages" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "outreach_messages_contact_idx" ON "outreach_messages" USING btree ("contact_id");