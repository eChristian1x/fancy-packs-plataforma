import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  dependencies,
  downloads,
  favorites,
  follows,
  galleryImages,
  mcVersions,
  resourceCategories,
  resourceFiles,
  resourceVersions,
  resources,
  type ResourceType,
} from "@/lib/db/schema";

// En los campos de un SELECT de una sola tabla Drizzle no antepone el nombre de la tabla:
// dentro de una subconsulta hay que escribirlo completo para no confundir columnas.
const RID = sql.raw(`"resources"."id"`);

export type PanelRow = {
  id: string;
  type: ResourceType;
  slug: string;
  name: string;
  status: string;
  coverUrl: string | null;
  iconUrl: string | null;
  downloadCount: number;
  favoriteCount: number;
  last30: number;
  versions: number;
  pendingVersions: number;
  updatedAt: string;
  rejectionReason: string | null;
};

/** Publicaciones de un usuario con sus cifras (para su panel). */
export async function getMyResources(userId: string): Promise<PanelRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: resources.id,
      type: resources.type,
      slug: resources.slug,
      name: resources.name,
      status: resources.status,
      coverUrl: resources.coverUrl,
      iconUrl: resources.iconUrl,
      downloadCount: resources.downloadCount,
      favoriteCount: resources.favoriteCount,
      updatedAt: resources.updatedAt,
      rejectionReason: resources.rejectionReason,
      last30: sql<number>`(select count(*)::int from downloads d where d.resource_id = ${RID} and d.ip_hash is not null and d.created_at > now() - interval '30 days')`,
      versions: sql<number>`(select count(*)::int from resource_versions v where v.resource_id = ${RID})`,
      pendingVersions: sql<number>`(select count(*)::int from resource_versions v where v.resource_id = ${RID} and v.published_at is null)`,
    })
    .from(resources)
    .where(and(eq(resources.ownerId, userId), sql`${resources.status} <> 'removed'`))
    .orderBy(desc(resources.updatedAt));
  return rows.map((r) => ({ ...r, updatedAt: new Date(r.updatedAt).toISOString() }));
}

/** Descargas por día (últimos `days` días) de las publicaciones de un usuario. */
export async function getDownloadSeries(userId: string, days = 30) {
  const db = await getDb();
  const rows = await db
    .select({ day: sql<string>`to_char(date_trunc('day', ${downloads.createdAt}), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(downloads)
    .innerJoin(resources, eq(resources.id, downloads.resourceId))
    .where(and(eq(resources.ownerId, userId), sql`${downloads.ipHash} is not null`, gte(downloads.createdAt, sql`now() - make_interval(days => ${days})`)))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.day, r.n]));
  const out: { day: string; n: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ day: d, n: map.get(d) ?? 0 });
  }
  return out;
}

export async function getCreatorTotals(userId: string) {
  const db = await getDb();
  const [[r], [f]] = await Promise.all([
    db
      .select({
        downloads: sql<number>`coalesce(sum(${resources.downloadCount}), 0)::int`,
        favorites: sql<number>`coalesce(sum(${resources.favoriteCount}), 0)::int`,
        published: sql<number>`count(*) filter (where ${resources.status} = 'published')::int`,
      })
      .from(resources)
      .where(eq(resources.ownerId, userId)),
    db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.creatorId, userId)),
  ]);
  return { ...r, followers: f.n };
}

export type EditableResource = Awaited<ReturnType<typeof getEditableResource>>;

/** Todo lo que necesita el editor de una publicación, incluidas versiones en revisión. */
export async function getEditableResource(id: string) {
  const db = await getDb();
  const [r] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  if (!r) return null;
  const [cats, allCats, gallery, versions, versionList] = await Promise.all([
    db.select({ id: resourceCategories.categoryId }).from(resourceCategories).where(eq(resourceCategories.resourceId, id)),
    db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.type, r.type)).orderBy(asc(categories.sortOrder)),
    db.select().from(galleryImages).where(eq(galleryImages.resourceId, id)).orderBy(asc(galleryImages.sortOrder)),
    db.select().from(resourceVersions).where(eq(resourceVersions.resourceId, id)).orderBy(desc(resourceVersions.createdAt)),
    db.select({ id: mcVersions.id, featured: mcVersions.isFeatured }).from(mcVersions).orderBy(desc(mcVersions.sortKey)),
  ]);
  const vIds = versions.map((v) => v.id);
  const [files, deps] = vIds.length
    ? await Promise.all([
        db.select().from(resourceFiles).where(inArray(resourceFiles.versionId, vIds)),
        db.select().from(dependencies).where(inArray(dependencies.versionId, vIds)),
      ])
    : [[], []];
  return {
    resource: r,
    categoryIds: cats.map((c) => c.id),
    allCategories: allCats,
    gallery,
    mcVersionList: versionList,
    versions: versions.map((v) => ({
      ...v,
      files: files.filter((f) => f.versionId === v.id),
      dependencies: deps.filter((d) => d.versionId === v.id),
    })),
  };
}

export async function favoriteCountFor(resourceId: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(favorites).where(eq(favorites.resourceId, resourceId));
  return n;
}
