CREATE TYPE "public"."report_type" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "report_type" NOT NULL,
	"period_key" varchar(32) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"story_count" integer DEFAULT 0 NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"provider" varchar(64),
	"model" varchar(128),
	"prompt_version" varchar(64),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reports_type_period_unique" ON "reports" USING btree ("type","period_key");--> statement-breakpoint
CREATE INDEX "reports_type_period_start_idx" ON "reports" USING btree ("type","period_start");