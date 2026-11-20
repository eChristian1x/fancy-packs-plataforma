ALTER TABLE "resources" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "resources_search_idx" ON "resources" USING gin ("search_text" gin_trgm_ops);