CREATE TYPE "public"."content_type" AS ENUM('news', 'paper', 'product', 'release', 'post', 'other');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('normalized', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."publication_time_confidence" AS ENUM('exact', 'inferred', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_reliability" AS ENUM('primary', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."source_run_status" AS ENUM('running', 'succeeded', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('active', 'degraded', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official_blog', 'rss', 'arxiv', 'github', 'product_hunt', 'hacker_news', 'media', 'social', 'other');--> statement-breakpoint
CREATE TYPE "public"."story_item_role" AS ENUM('primary', 'supporting', 'duplicate', 'context');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('emerging', 'confirmed', 'cooling', 'corrected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."topic_type" AS ENUM('company', 'model', 'technology', 'content_type', 'person', 'other');--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" varchar(512),
	"content_type" "content_type" NOT NULL,
	"status" "item_status" DEFAULT 'normalized' NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"excerpt" text,
	"content" text,
	"author" varchar(256),
	"language" varchar(16),
	"original_url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"canonical_url_hash" varchar(64) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"source_published_at" timestamp with time zone,
	"publication_time_confidence" "publication_time_confidence" DEFAULT 'unknown' NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"raw_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" "source_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"stored_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" "source_type" NOT NULL,
	"reliability" "source_reliability" DEFAULT 'medium' NOT NULL,
	"status" "source_status" DEFAULT 'active' NOT NULL,
	"language" varchar(16),
	"homepage_url" text,
	"feed_url" text,
	"connector_key" varchar(128) NOT NULL,
	"fetch_interval_minutes" integer DEFAULT 60 NOT NULL,
	"is_first_party" boolean DEFAULT false NOT NULL,
	"allow_full_text" boolean DEFAULT false NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(256) NOT NULL,
	"status" "story_status" DEFAULT 'emerging' NOT NULL,
	"title" text NOT NULL,
	"factual_summary" text,
	"primary_item_id" uuid,
	"first_published_at" timestamp with time zone,
	"last_published_at" timestamp with time zone,
	"independent_source_count" integer DEFAULT 1 NOT NULL,
	"freshness_score" real,
	"evidence_score" real,
	"relevance_score" real,
	"overall_score" real,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"factual_summary" text NOT NULL,
	"why_it_matters" text,
	"underlying_logic" text,
	"product_impact" text,
	"product_opportunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"open_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_item_ids" uuid[] DEFAULT '{}' NOT NULL,
	"confidence" real NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"prompt_version" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_items" (
	"story_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"role" "story_item_role" DEFAULT 'supporting' NOT NULL,
	"similarity" real,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_topics" (
	"story_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"confidence" real,
	"assigned_by" varchar(64) DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" "topic_type" NOT NULL,
	"description" text,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_primary_item_id_items_id_fk" FOREIGN KEY ("primary_item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_analyses" ADD CONSTRAINT "story_analyses_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_items" ADD CONSTRAINT "story_items_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_items" ADD CONSTRAINT "story_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_topics" ADD CONSTRAINT "story_topics_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_topics" ADD CONSTRAINT "story_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "items_canonical_url_hash_unique" ON "items" USING btree ("canonical_url_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "items_source_external_id_unique" ON "items" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "items_source_published_idx" ON "items" USING btree ("source_id","source_published_at");--> statement-breakpoint
CREATE INDEX "items_content_type_published_idx" ON "items" USING btree ("content_type","source_published_at");--> statement-breakpoint
CREATE INDEX "items_content_hash_idx" ON "items" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "source_runs_source_started_idx" ON "source_runs" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE INDEX "source_runs_status_idx" ON "source_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_slug_unique" ON "sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sources_status_idx" ON "sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sources_connector_key_idx" ON "sources" USING btree ("connector_key");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_slug_unique" ON "stories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stories_status_score_idx" ON "stories" USING btree ("status","overall_score");--> statement-breakpoint
CREATE INDEX "stories_first_published_idx" ON "stories" USING btree ("first_published_at");--> statement-breakpoint
CREATE INDEX "story_analyses_story_created_idx" ON "story_analyses" USING btree ("story_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_items_story_item_unique" ON "story_items" USING btree ("story_id","item_id");--> statement-breakpoint
CREATE INDEX "story_items_item_idx" ON "story_items" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_topics_story_topic_unique" ON "story_topics" USING btree ("story_id","topic_id");--> statement-breakpoint
CREATE INDEX "story_topics_topic_idx" ON "story_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_unique" ON "topics" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "topics_type_active_idx" ON "topics" USING btree ("type","is_active");