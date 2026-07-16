CREATE TABLE "item_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"scorer_version" varchar(64) NOT NULL,
	"relevance_score" real NOT NULL,
	"ai_centrality_score" real NOT NULL,
	"product_impact_score" real NOT NULL,
	"is_relevant" boolean NOT NULL,
	"matched_signals" text[] DEFAULT '{}' NOT NULL,
	"reasons" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_items" ADD COLUMN "cluster_version" varchar(64);--> statement-breakpoint
ALTER TABLE "story_items" ADD COLUMN "match_reasons" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "item_assessments" ADD CONSTRAINT "item_assessments_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_assessments_item_scorer_unique" ON "item_assessments" USING btree ("item_id","scorer_version");--> statement-breakpoint
CREATE INDEX "item_assessments_scorer_relevant_idx" ON "item_assessments" USING btree ("scorer_version","is_relevant","relevance_score");