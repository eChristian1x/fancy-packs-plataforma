CREATE TYPE "public"."mod_loader" AS ENUM('fabric', 'forge', 'neoforge', 'quilt');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('draft', 'pending', 'published', 'rejected', 'removed');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('texture', 'overlay', 'mod', 'skin', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'creator', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "resource_type" NOT NULL,
	"slug" varchar(48) NOT NULL,
	"name" varchar(48) NOT NULL,
	"description" text,
	"icon" varchar(32),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"status" varchar(12) DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" uuid NOT NULL,
	"depends_on_resource_id" uuid,
	"external_name" varchar(80),
	"external_url" text,
	"kind" varchar(12) DEFAULT 'required' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dependencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL,
	"version_id" uuid,
	"file_id" uuid,
	"user_id" uuid,
	"ip_hash" char(64),
	"source" varchar(12) DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "downloads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_resource_id_pk" PRIMARY KEY("user_id","resource_id")
);
--> statement-breakpoint
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_creator_id_pk" PRIMARY KEY("follower_id","creator_id"),
	CONSTRAINT "follows_not_self" CHECK ("follows"."follower_id" <> "follows"."creator_id")
);
--> statement-breakpoint
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"caption" varchar(140),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mc_versions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"kind" varchar(12) DEFAULT 'release' NOT NULL,
	"released_at" date,
	"sort_key" integer NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mc_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(32) NOT NULL,
	"display_name" varchar(48) NOT NULL,
	"bio" text,
	"avatar_url" text,
	"banner_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"socials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ratings" (
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_id_resource_id_pk" PRIMARY KEY("user_id","resource_id"),
	CONSTRAINT "ratings_score_check" CHECK ("ratings"."score" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" varchar(12) NOT NULL,
	"target_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" varchar(32) NOT NULL,
	"details" text,
	"status" varchar(12) DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resource_categories" (
	"resource_id" uuid NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "resource_categories_resource_id_category_id_pk" PRIMARY KEY("resource_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "resource_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resource_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" varchar(160) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha1" char(40) NOT NULL,
	"sha512" char(128) NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"scan_status" varchar(12) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resource_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"version_number" varchar(32) NOT NULL,
	"title" varchar(80),
	"changelog" text,
	"channel" varchar(8) DEFAULT 'release' NOT NULL,
	"mc_versions" text[] DEFAULT '{}'::text[] NOT NULL,
	"loaders" "mod_loader"[] DEFAULT '{}'::mod_loader[] NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "resource_type" NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(80) NOT NULL,
	"summary" varchar(200) NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"author_name" varchar(48) NOT NULL,
	"author_url" text,
	"permission_note" text,
	"resolution" smallint,
	"mc_versions" text[] DEFAULT '{}'::text[] NOT NULL,
	"loaders" "mod_loader"[] DEFAULT '{}'::mod_loader[] NOT NULL,
	"status" "resource_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"cover_url" text,
	"icon_url" text,
	"download_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_resolution_check" CHECK ("resources"."resolution" is null or "resources"."resolution" between 8 and 4096)
);
--> statement-breakpoint
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(48) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_version_id_resource_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."resource_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_depends_on_resource_id_resources_id_fk" FOREIGN KEY ("depends_on_resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_version_id_resource_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."resource_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_file_id_resource_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resource_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_profiles_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_creator_id_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_profiles_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD CONSTRAINT "resource_categories_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_categories" ADD CONSTRAINT "resource_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_version_id_resource_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."resource_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_type_slug_key" ON "categories" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "comments_resource_idx" ON "comments" USING btree ("resource_id","created_at");--> statement-breakpoint
CREATE INDEX "dependencies_version_idx" ON "dependencies" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "downloads_resource_idx" ON "downloads" USING btree ("resource_id","created_at");--> statement-breakpoint
CREATE INDEX "downloads_user_idx" ON "downloads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_resource_idx" ON "favorites" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "follows_creator_idx" ON "follows" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "gallery_images_resource_idx" ON "gallery_images" USING btree ("resource_id","sort_order");--> statement-breakpoint
CREATE INDEX "mc_versions_sort_idx" ON "mc_versions" USING btree ("sort_key");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "resource_categories_cat_idx" ON "resource_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "resource_files_version_idx" ON "resource_files" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_versions_number_key" ON "resource_versions" USING btree ("resource_id","version_number");--> statement-breakpoint
CREATE INDEX "resource_versions_resource_idx" ON "resource_versions" USING btree ("resource_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_slug_key" ON "resources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "resources_listing_idx" ON "resources" USING btree ("type","status","published_at");--> statement-breakpoint
CREATE INDEX "resources_popular_idx" ON "resources" USING btree ("type","status","download_count");--> statement-breakpoint
CREATE INDEX "resources_owner_idx" ON "resources" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "resources_mc_versions_idx" ON "resources" USING gin ("mc_versions");--> statement-breakpoint
CREATE INDEX "resources_loaders_idx" ON "resources" USING gin ("loaders");