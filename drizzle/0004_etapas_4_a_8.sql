CREATE TABLE "image_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"url" text NOT NULL,
	"kind" varchar(12) DEFAULT 'gallery' NOT NULL,
	"vector" real[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_features" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "image_features" ADD CONSTRAINT "image_features_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_features_resource_idx" ON "image_features" USING btree ("resource_id");