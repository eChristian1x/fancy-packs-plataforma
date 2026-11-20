/**
 * Esquema de la base de datos de Fancy Packs.
 *
 * Cubre todas las etapas del proyecto para no tener que rehacer tablas más adelante:
 * recursos (texturas, overlays, mods, skins), versiones y archivos, categorías,
 * versiones de Minecraft, perfiles, descargas, favoritos, seguimientos, comentarios,
 * valoraciones y reportes.
 *
 * Todas las tablas tienen RLS activado y sin políticas: en Supabase eso bloquea el
 * acceso directo por la API REST pública. La app lee y escribe desde el servidor con
 * la conexión de DATABASE_URL, que es dueña de las tablas y no pasa por RLS.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  char,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const resourceType = pgEnum("resource_type", ["texture", "overlay", "mod", "skin", "other"]);
export const resourceStatus = pgEnum("resource_status", ["draft", "pending", "published", "rejected", "removed"]);
export const userRole = pgEnum("user_role", ["user", "creator", "moderator", "admin"]);
export const modLoader = pgEnum("mod_loader", ["fabric", "forge", "neoforge", "quilt"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export type SocialLink = { label: string; url: string };

/** Perfil público. En Supabase, `id` es el mismo que auth.users.id (se enlaza en la etapa 6). */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 48 }).notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    bannerUrl: text("banner_url"),
    role: userRole("role").notNull().default("user"),
    socials: jsonb("socials").$type<SocialLink[]>().notNull().default([]),
    isVerified: boolean("is_verified").notNull().default(false),
    /** Cuenta suspendida por un administrador: no puede publicar ni comentar. */
    isBanned: boolean("is_banned").notNull().default(false),
    /** Datos de prueba: se muestran marcados y se borran con `npm run db:clear-samples`. */
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("profiles_username_key").on(sql`lower(${t.username})`)],
).enableRLS();

/** Versiones de Minecraft disponibles en filtros y formularios. */
export const mcVersions = pgTable(
  "mc_versions",
  {
    id: varchar("id", { length: 24 }).primaryKey(),
    kind: varchar("kind", { length: 12 }).notNull().default("release"),
    releasedAt: date("released_at"),
    /** Orden numérico (1.21.11 → 12111). Evita ordenar versiones como texto. */
    sortKey: integer("sort_key").notNull(),
    /** Aparece en los filtros rápidos. */
    isFeatured: boolean("is_featured").notNull().default(false),
  },
  (t) => [index("mc_versions_sort_idx").on(t.sortKey)],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    type: resourceType("type").notNull(),
    slug: varchar("slug", { length: 48 }).notNull(),
    name: varchar("name", { length: 48 }).notNull(),
    description: text("description"),
    /** Clave del icono pixel (ver src/components/ui/PixelIcon.tsx). */
    icon: varchar("icon", { length: 32 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_type_slug_key").on(t.type, t.slug)],
).enableRLS();

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: resourceType("type").notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 200 }).notNull(),
    description: text("description"),
    /** Cuenta que administra la publicación. */
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    /** Crédito que se muestra. Si es distinto del dueño, `permissionNote` es obligatorio. */
    authorName: varchar("author_name", { length: 48 }).notNull(),
    authorUrl: text("author_url"),
    permissionNote: text("permission_note"),
    /** Resolución en píxeles (16, 32, 64, 128, 256, 512). Solo texturas y overlays. */
    resolution: smallint("resolution"),
    mcVersions: text("mc_versions").array().notNull().default(sql`'{}'::text[]`),
    loaders: modLoader("loaders").array().notNull().default(sql`'{}'::mod_loader[]`),
    status: resourceStatus("status").notNull().default("draft"),
    /** Motivo que ve el creador cuando un administrador rechaza la publicación. */
    rejectionReason: text("rejection_reason"),
    featured: boolean("featured").notNull().default(false),
    isSample: boolean("is_sample").notNull().default(false),
    coverUrl: text("cover_url"),
    iconUrl: text("icon_url"),
    downloadCount: integer("download_count").notNull().default(0),
    /** Texto normalizado (minúsculas, sin acentos) para buscar: nombre, resumen, autor, categorías. Ver db/search.ts */
    searchText: text("search_text").notNull().default(""),
    favoriteCount: integer("favorite_count").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("resources_slug_key").on(t.slug),
    index("resources_listing_idx").on(t.type, t.status, t.publishedAt),
    index("resources_popular_idx").on(t.type, t.status, t.downloadCount),
    index("resources_owner_idx").on(t.ownerId),
    index("resources_mc_versions_idx").using("gin", t.mcVersions),
    index("resources_loaders_idx").using("gin", t.loaders),
    index("resources_search_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
    check("resources_resolution_check", sql`${t.resolution} is null or ${t.resolution} between 8 and 4096`),
  ],
).enableRLS();

export const resourceCategories = pgTable(
  "resource_categories",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resourceId, t.categoryId] }), index("resource_categories_cat_idx").on(t.categoryId)],
).enableRLS();

/** Historial de versiones (mods y packs). La más reciente publicada es la que se descarga. */
export const resourceVersions = pgTable(
  "resource_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    versionNumber: varchar("version_number", { length: 32 }).notNull(),
    title: varchar("title", { length: 80 }),
    changelog: text("changelog"),
    channel: varchar("channel", { length: 8 }).notNull().default("release"),
    mcVersions: text("mc_versions").array().notNull().default(sql`'{}'::text[]`),
    loaders: modLoader("loaders").array().notNull().default(sql`'{}'::mod_loader[]`),
    downloadCount: integer("download_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("resource_versions_number_key").on(t.resourceId, t.versionNumber),
    index("resource_versions_resource_idx").on(t.resourceId, t.publishedAt),
  ],
).enableRLS();

export const resourceFiles = pgTable(
  "resource_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => resourceVersions.id, { onDelete: "cascade" }),
    /** Ruta dentro del bucket de Supabase Storage. */
    storagePath: text("storage_path").notNull(),
    fileName: varchar("file_name", { length: 160 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha1: char("sha1", { length: 40 }).notNull(),
    sha512: char("sha512", { length: 128 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    /** pending → revisión automática del .zip/.jar; clean → se puede descargar. */
    scanStatus: varchar("scan_status", { length: 12 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resource_files_version_idx").on(t.versionId)],
).enableRLS();

export const dependencies = pgTable(
  "dependencies",
  {
    id: serial("id").primaryKey(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => resourceVersions.id, { onDelete: "cascade" }),
    dependsOnResourceId: uuid("depends_on_resource_id").references(() => resources.id, { onDelete: "set null" }),
    externalName: varchar("external_name", { length: 80 }),
    externalUrl: text("external_url"),
    kind: varchar("kind", { length: 12 }).notNull().default("required"),
  },
  (t) => [index("dependencies_version_idx").on(t.versionId)],
).enableRLS();

export const galleryImages = pgTable(
  "gallery_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: varchar("caption", { length: 140 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("gallery_images_resource_idx").on(t.resourceId, t.sortOrder)],
).enableRLS();

/** Registro de cada descarga. `ipHash` es SHA-256(ip + secreto), nunca la IP en claro. */
export const downloads = pgTable(
  "downloads",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => resourceVersions.id, { onDelete: "set null" }),
    fileId: uuid("file_id").references(() => resourceFiles.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    ipHash: char("ip_hash", { length: 64 }),
    source: varchar("source", { length: 12 }).notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("downloads_resource_idx").on(t.resourceId, t.createdAt), index("downloads_user_idx").on(t.userId)],
).enableRLS();

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.resourceId] }), index("favorites_resource_idx").on(t.resourceId)],
).enableRLS();

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.creatorId] }),
    index("follows_creator_idx").on(t.creatorId),
    check("follows_not_self", sql`${t.followerId} <> ${t.creatorId}`),
  ],
).enableRLS();

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [index("comments_resource_idx").on(t.resourceId, t.createdAt)],
).enableRLS();

export const ratings = pgTable(
  "ratings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    score: smallint("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.resourceId] }),
    check("ratings_score_check", sql`${t.score} between 1 and 5`),
  ],
).enableRLS();

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: varchar("target_type", { length: 12 }).notNull(),
    targetId: uuid("target_id").notNull(),
    reporterId: uuid("reporter_id").references(() => profiles.id, { onDelete: "set null" }),
    reason: varchar("reason", { length: 32 }).notNull(),
    details: text("details"),
    status: varchar("status", { length: 12 }).notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => profiles.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt)],
).enableRLS();

/**
 * Huella visual de cada imagen (portada y galería) para "Buscar por captura".
 * Vector de colores y forma general calculado en el navegador al subir la imagen
 * (src/lib/image-features.ts). Se compara por similitud de coseno.
 */
export const imageFeatures = pgTable(
  "image_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    kind: varchar("kind", { length: 12 }).notNull().default("gallery"),
    vector: real("vector").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("image_features_resource_idx").on(t.resourceId)],
).enableRLS();

/** Ajustes editables del sitio (nombre, frase, contacto…). Los usa también la API del mod. */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 48 }).primaryKey(),
  value: jsonb("value").notNull(),
}).enableRLS();

export type Resource = typeof resources.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ResourceType = (typeof resourceType.enumValues)[number];
export type ModLoader = (typeof modLoader.enumValues)[number];
