ALTER TABLE "sources" ADD COLUMN "lease_owner" varchar(128);--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "sources_status_lease_idx" ON "sources" USING btree ("status","lease_expires_at");