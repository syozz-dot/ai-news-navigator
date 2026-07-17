CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"configured" boolean DEFAULT false NOT NULL,
	"acquired" boolean DEFAULT false NOT NULL,
	"provider" varchar(64),
	"model" varchar(128),
	"attempted_count" integer DEFAULT 0 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error_messages" text[] DEFAULT '{}' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "analysis_runs_started_idx" ON "analysis_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs" USING btree ("status");