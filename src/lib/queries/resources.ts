import "server-only";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import { categories, profiles, resourceCategories, resources, siteSettings, type ResourceType } from "@/lib/db/schema";

/** Datos que necesita cualquier tarjeta de recurso. Las fechas van como texto ISO para poder cachearlas. */
export type ResourceCard = {
  id: string;
  type: ResourceType;
  slug: string;
  name: string;
  summary: string;
  authorName: string;
  ownerUsername: string;
  resolution: number | null;
  mcVersions: string[];
  loaders: string[];
  downloadCount: number;
  coverUrl: string | null;
  iconUrl: string | null;
  featured: boolean;
  isSample: boolean;
  publishedAt: string | null;
  categories: { slug: string; name: string }[];
};

export const CACHE_TAG = "resources";
const REVALIDATE = 60;

const published = eq(resources.status, "published");

/** Tarjetas de recursos publicados. La usan el inicio, el catálogo y la búsqueda. */
export async function selectCards(where: SQL | undefined, order: SQL[], limit: number, offset = 0): Promise<ResourceCard[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: resources.id,
      type: resources.type,
      slug: resources.slug,
      name: resources.name,
      summary: resources.summary,
      authorName: resources.authorName,
      ownerUsername: profiles.username,
      resolution: resources.resolution,
      mcVersions: resources.mcVersions,
      loaders: resources.loaders,
      downloadCount: resources.downloadCount,
      coverUrl: resources.coverUrl,
      iconUrl: resources.iconUrl,
      featured: resources.featured,
      isSample: resources.isSample,
      publishedAt: resources.publishedAt,
    })
    .from(resources)
    .innerJoin(profiles, eq(profiles.id, resources.ownerId))
    .where(where ? and(published, where) : published)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
  if (!rows.length) return [];

  const cats = await db
    .select({ resourceId: resourceCategories.resourceId, slug: categories.slug, name: categories.name, order: categories.sortOrder })
    .from(resourceCategories)
    .innerJoin(categories, eq(categories.id, resourceCategories.categoryId))
    .where(inArray(resourceCategories.resourceId, rows.map((r) => r.id)))
    .orderBy(categories.sortOrder);

  return rows.map((r) => ({
    ...r,
    loaders: r.loaders as string[],
    publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    categories: cats.filter((c) => c.resourceId === r.id).map(({ slug, name }) => ({ slug, name })),
  }));
}

export const getPopular = unstable_cache(
  (type: ResourceType, limit: number) =>
    selectCards(eq(resources.type, type), [desc(resources.downloadCount), desc(resources.publishedAt)], limit),
  ["popular"],
  { tags: [CACHE_TAG], revalidate: REVALIDATE },
);

export const getLatest = unstable_cache(
  (type: ResourceType, limit: number) => selectCards(eq(resources.type, type), [desc(resources.publishedAt)], limit),
  ["latest"],
  { tags: [CACHE_TAG], revalidate: REVALIDATE },
);

/** Recomendados por el equipo: marcados como destacados, de cualquier tipo. */
export const getFeatured = unstable_cache(
  (limit: number) => selectCards(eq(resources.featured, true), [desc(resources.downloadCount)], limit),
  ["featured"],
  { tags: [CACHE_TAG], revalidate: REVALIDATE },
);

export type PlatformStats = {
  textures: number;
  overlays: number;
  mods: number;
  downloads: number;
  creators: number;
  hasSamples: boolean;
};

export const getStats = unstable_cache(
  async (): Promise<PlatformStats> => {
    const db = await getDb();
    const [row] = await db
      .select({
        textures: sql<number>`count(*) filter (where ${resources.type} = 'texture')::int`,
        overlays: sql<number>`count(*) filter (where ${resources.type} = 'overlay')::int`,
        mods: sql<number>`count(*) filter (where ${resources.type} = 'mod')::int`,
        downloads: sql<number>`coalesce(sum(${resources.downloadCount}), 0)::bigint`,
        creators: sql<number>`count(distinct ${resources.ownerId})::int`,
        samples: sql<number>`count(*) filter (where ${resources.isSample})::int`,
      })
      .from(resources)
      .where(published);
    return {
      textures: row.textures,
      overlays: row.overlays,
      mods: row.mods,
      downloads: Number(row.downloads),
      creators: row.creators,
      hasSamples: row.samples > 0,
    };
  },
  ["stats"],
  { tags: [CACHE_TAG], revalidate: REVALIDATE },
);

export type CategoryCount = { type: ResourceType; slug: string; name: string; icon: string | null; description: string | null; count: number };

export const getCategoryCounts = unstable_cache(
  async (): Promise<CategoryCount[]> => {
    const db = await getDb();
    return db
      .select({
        type: categories.type,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
        description: categories.description,
        count: sql<number>`count(${resources.id})::int`,
      })
      .from(categories)
      .leftJoin(resourceCategories, eq(resourceCategories.categoryId, categories.id))
      .leftJoin(resources, and(eq(resources.id, resourceCategories.resourceId), published))
      .groupBy(categories.id)
      .orderBy(categories.type, categories.sortOrder);
  },
  ["category-counts"],
  { tags: [CACHE_TAG], revalidate: REVALIDATE },
);

export type CreatorSummary = {
  username: string;
  displayName: string;
  isSample: boolean;
  resources: number;
  downloads: number;
};

/** Creadores con más descargas en lo que han publicado. */
export const getTopCreators = unstable_cache(
  async (limit: number): Promise<CreatorSummary[]> => {
    const db = await getDb();
    const rows = await db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        isSample: profiles.isSample,
        resources: sql<number>`count(${resources.id})::int`,
        downloads: sql<number>`coalesce(sum(${resources.downloadCount}), 0)::bigint`,
      })
      .from(profiles)
      .innerJoin(resources, and(eq(resources.ownerId, profiles.id), published))
      .groupBy(profiles.id)
      .orderBy(desc(sql`sum(${resources.downloadCount})`))
      .limit(limit);
    return rows.map((r) => ({ ...r, downloads: Number(r.downloads) }));
  },
  ["top-creators"],
  { tags: [CACHE_TAG], revalidate: REVALIDATE },
);

export type SiteInfo = { name: string; tagline: string; contact: string };

export const getSiteInfo = unstable_cache(
  async (): Promise<SiteInfo> => {
    const db = await getDb();
    const rows = await db.select().from(siteSettings);
    const get = (k: string, d: string) => {
      const v = rows.find((r) => r.key === k)?.value;
      return typeof v === "string" ? v : d;
    };
    return {
      name: get("name", "Fancy Packs"),
      tagline: get("tagline", "Texturas PvP, overlays y mods para Minecraft Java"),
      contact: get("contact", ""),
    };
  },
  ["site-info"],
  { tags: ["site"], revalidate: 300 },
);
