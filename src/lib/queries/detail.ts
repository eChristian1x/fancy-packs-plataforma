import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  categories,
  comments,
  dependencies,
  galleryImages,
  profiles,
  resourceCategories,
  resourceFiles,
  resourceVersions,
  resources,
  type ResourceType,
} from "@/lib/db/schema";
import { CACHE_TAG, selectCards, type ResourceCard } from "./resources";

export type FileInfo = {
  id: string;
  fileName: string;
  sizeBytes: number;
  sha1: string;
  sha512: string;
  storagePath: string;
  scanStatus: string;
};

export type VersionInfo = {
  id: string;
  versionNumber: string;
  title: string | null;
  changelog: string | null;
  channel: string;
  mcVersions: string[];
  loaders: string[];
  downloadCount: number;
  publishedAt: string | null;
  files: FileInfo[];
  dependencies: { name: string; slug: string | null; type: ResourceType | null; url: string | null; kind: string }[];
};

export type CommentInfo = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  score: number | null;
};

export type ResourceDetail = {
  id: string;
  type: ResourceType;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  status: string;
  rejectionReason: string | null;
  authorName: string;
  authorUrl: string | null;
  permissionNote: string | null;
  owner: { id: string; username: string; displayName: string; bio: string | null; avatarUrl: string | null; isVerified: boolean; isSample: boolean };
  resolution: number | null;
  mcVersions: string[];
  loaders: string[];
  featured: boolean;
  isSample: boolean;
  coverUrl: string | null;
  iconUrl: string | null;
  downloadCount: number;
  favoriteCount: number;
  ratingSum: number;
  ratingCount: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  categories: { slug: string; name: string; icon: string | null }[];
  gallery: { url: string; width: number | null; height: number | null; caption: string | null }[];
  versions: VersionInfo[];
  comments: CommentInfo[];
};

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

/** Recurso completo por tipo y slug. `includeUnpublished` solo para el dueño o un administrador. */
async function load(type: ResourceType, slug: string, includeUnpublished = false): Promise<ResourceDetail | null> {
  const db = await getDb();
  const [r] = await db
    .select({
      resource: resources,
      owner: {
        id: profiles.id,
        username: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        isVerified: profiles.isVerified,
        isSample: profiles.isSample,
      },
    })
    .from(resources)
    .innerJoin(profiles, eq(profiles.id, resources.ownerId))
    .where(and(eq(resources.type, type), eq(resources.slug, slug), includeUnpublished ? undefined : eq(resources.status, "published")))
    .limit(1);
  if (!r) return null;
  const res = r.resource;

  const [cats, gallery, versions, commentRows] = await Promise.all([
    db
      .select({ slug: categories.slug, name: categories.name, icon: categories.icon })
      .from(resourceCategories)
      .innerJoin(categories, eq(categories.id, resourceCategories.categoryId))
      .where(eq(resourceCategories.resourceId, res.id))
      .orderBy(asc(categories.sortOrder)),
    db
      .select({ url: galleryImages.url, width: galleryImages.width, height: galleryImages.height, caption: galleryImages.caption })
      .from(galleryImages)
      .where(eq(galleryImages.resourceId, res.id))
      .orderBy(asc(galleryImages.sortOrder)),
    db
      .select()
      .from(resourceVersions)
      .where(and(eq(resourceVersions.resourceId, res.id), sql`${resourceVersions.publishedAt} is not null`))
      .orderBy(desc(resourceVersions.publishedAt)),
    db
      .select({
        id: comments.id,
        userId: comments.userId,
        body: comments.body,
        createdAt: comments.createdAt,
        editedAt: comments.editedAt,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        score: sql<number | null>`(select score from ratings rt where rt.user_id = ${comments.userId} and rt.resource_id = ${comments.resourceId})`,
      })
      .from(comments)
      .innerJoin(profiles, eq(profiles.id, comments.userId))
      .where(and(eq(comments.resourceId, res.id), eq(comments.status, "visible")))
      .orderBy(desc(comments.createdAt))
      .limit(100),
  ]);

  const vIds = versions.map((v) => v.id);
  const [files, deps] = vIds.length
    ? await Promise.all([
        db.select().from(resourceFiles).where(inArray(resourceFiles.versionId, vIds)).orderBy(desc(resourceFiles.isPrimary)),
        db
          .select({
            versionId: dependencies.versionId,
            kind: dependencies.kind,
            externalName: dependencies.externalName,
            externalUrl: dependencies.externalUrl,
            depName: resources.name,
            depSlug: resources.slug,
            depType: resources.type,
          })
          .from(dependencies)
          .leftJoin(resources, eq(resources.id, dependencies.dependsOnResourceId))
          .where(inArray(dependencies.versionId, vIds)),
      ])
    : [[], []];

  return {
    id: res.id,
    type: res.type,
    slug: res.slug,
    name: res.name,
    summary: res.summary,
    description: res.description,
    status: res.status,
    rejectionReason: res.rejectionReason,
    authorName: res.authorName,
    authorUrl: res.authorUrl,
    permissionNote: res.permissionNote,
    owner: r.owner,
    resolution: res.resolution,
    mcVersions: res.mcVersions,
    loaders: res.loaders as string[],
    featured: res.featured,
    isSample: res.isSample,
    coverUrl: res.coverUrl,
    iconUrl: res.iconUrl,
    downloadCount: res.downloadCount,
    favoriteCount: res.favoriteCount,
    ratingSum: res.ratingSum,
    ratingCount: res.ratingCount,
    publishedAt: iso(res.publishedAt),
    updatedAt: iso(res.updatedAt)!,
    createdAt: iso(res.createdAt)!,
    categories: cats,
    gallery,
    versions: versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      title: v.title,
      changelog: v.changelog,
      channel: v.channel,
      mcVersions: v.mcVersions,
      loaders: v.loaders as string[],
      downloadCount: v.downloadCount,
      publishedAt: iso(v.publishedAt),
      files: files
        .filter((f) => f.versionId === v.id)
        .map((f) => ({ id: f.id, fileName: f.fileName, sizeBytes: f.sizeBytes, sha1: f.sha1, sha512: f.sha512, storagePath: f.storagePath, scanStatus: f.scanStatus })),
      dependencies: deps
        .filter((d) => d.versionId === v.id)
        .map((d) => ({ name: d.depName ?? d.externalName ?? "?", slug: d.depSlug, type: d.depType, url: d.externalUrl, kind: d.kind })),
    })),
    comments: commentRows.map((c) => ({ ...c, createdAt: iso(c.createdAt)!, editedAt: iso(c.editedAt) })),
  };
}

export const resourceTag = (slug: string) => `recurso:${slug}`;

/** Con caché por recurso: comentar o valorar solo invalida la página de ese recurso. */
export const getResource = (type: ResourceType, slug: string) =>
  unstable_cache(() => load(type, slug), ["resource", type, slug], { tags: [CACHE_TAG, resourceTag(slug)], revalidate: 60 })();

/** Sin caché: para el dueño o un administrador (borradores y pendientes). */
export const getResourceFresh = (type: ResourceType, slug: string) => load(type, slug, true);

/** Del mismo tipo que comparten alguna categoría; si no hay suficientes, los más populares del tipo. */
export const getRelated = unstable_cache(
  async (type: ResourceType, id: string, catSlugs: string[], limit: number): Promise<ResourceCard[]> => {
    const base = and(eq(resources.type, type), ne(resources.id, id));
    const byCat = catSlugs.length
      ? await selectCards(
          and(
            base,
            sql`exists (select 1 from resource_categories rc join categories c on c.id = rc.category_id
              where rc.resource_id = ${resources.id} and c.slug in (${sql.join(catSlugs.map((s) => sql`${s}`), sql`, `)}))`,
          ),
          [desc(resources.downloadCount)],
          limit,
        )
      : [];
    if (byCat.length >= limit) return byCat;
    const more = await selectCards(
      and(base, byCat.length ? sql`${resources.id} not in (${sql.join(byCat.map((r) => sql`${r.id}`), sql`, `)})` : undefined),
      [desc(resources.downloadCount)],
      limit - byCat.length,
    );
    return [...byCat, ...more];
  },
  ["related"],
  { tags: [CACHE_TAG], revalidate: 300 },
);

/** Archivo principal de la versión más reciente publicada (o un archivo concreto). */
export async function findDownload(opts: { slug: string; fileId?: string; fileName?: string }) {
  const db = await getDb();
  const rows = await db
    .select({
      resourceId: resources.id,
      type: resources.type,
      isSample: resources.isSample,
      versionId: resourceVersions.id,
      fileId: resourceFiles.id,
      fileName: resourceFiles.fileName,
      storagePath: resourceFiles.storagePath,
      sizeBytes: resourceFiles.sizeBytes,
      scanStatus: resourceFiles.scanStatus,
    })
    .from(resourceFiles)
    .innerJoin(resourceVersions, eq(resourceVersions.id, resourceFiles.versionId))
    .innerJoin(resources, eq(resources.id, resourceVersions.resourceId))
    .where(
      and(
        eq(resources.slug, opts.slug),
        eq(resources.status, "published"),
        eq(resourceFiles.scanStatus, "clean"),
        sql`${resourceVersions.publishedAt} is not null`,
        opts.fileId ? eq(resourceFiles.id, opts.fileId) : undefined,
        opts.fileName ? eq(resourceFiles.fileName, opts.fileName) : undefined,
      ),
    )
    .orderBy(desc(resourceVersions.publishedAt), desc(resourceFiles.isPrimary))
    .limit(1);
  return rows[0] ?? null;
}
