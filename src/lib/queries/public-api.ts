import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profiles, resourceFiles, resourceVersions, resources } from "@/lib/db/schema";
import { creatorHref, resourceHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import { fileUrl } from "@/lib/storage";
import { POPULARITY, relevance, textCondition } from "./catalog";
import { getResource, type ResourceDetail } from "./detail";
import { selectCards, type ResourceCard } from "./resources";

/**
 * API pública v1 para el mod y otras apps: lista, detalle y descarga de resource packs
 * (texturas y overlays). Mismo estilo que /api/v1/packs.json: snake_case y URLs absolutas.
 */

export const API_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
};
export const API_NO_STORE = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };

export const apiError = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: API_NO_STORE });

const abs = (u: string | null | undefined) => (u ? new URL(u, SITE_URL).toString() : null);
const API = `${SITE_URL}/api/v1/packs`;
const PACK_TYPES = ["texture", "overlay"] as const;
type PackType = (typeof PACK_TYPES)[number];

/** Que tenga al menos una versión publicada con su archivo revisado: sin eso el mod no puede instalarlo. */
const DOWNLOADABLE = sql`exists (select 1 from resource_versions v join resource_files f on f.version_id = v.id
  where v.resource_id = ${resources.id} and v.published_at is not null and f.scan_status = 'clean')`;

// ------------------------------------------------------------------ lista

export const SORTS = ["popular", "downloads", "recent", "updated", "name", "relevance"] as const;
export type Sort = (typeof SORTS)[number];
const SORT_ALIAS: Record<string, Sort> = {
  popular: "popular", populares: "popular", trending: "popular",
  downloads: "downloads", descargas: "downloads",
  recent: "recent", new: "recent", newest: "recent", recientes: "recent",
  updated: "updated", actualizados: "updated",
  name: "name", nombre: "name", az: "name",
  relevance: "relevance", relevancia: "relevance",
};

export type ListParams = {
  q: string;
  sort: Sort;
  version: string | null;
  type: PackType | null;
  category: string | null;
  resolution: number | null;
  page: number;
  limit: number;
  samples: boolean;
};

export function parseListParams(sp: URLSearchParams): ListParams {
  const q = (sp.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const rawSort = SORT_ALIAS[(sp.get("sort") ?? "").toLowerCase()];
  const type = (sp.get("type") ?? "").toLowerCase();
  const res = Number.parseInt(sp.get("resolution") ?? "", 10);
  const version = (sp.get("version") ?? "").trim();
  const category = (sp.get("category") ?? "").trim().toLowerCase();
  return {
    q,
    sort: rawSort ?? (q ? "relevance" : "popular"),
    version: /^[0-9][0-9a-z.\-]{0,15}$/i.test(version) ? version : null,
    type: type === "texture" || type === "overlay" ? type : null,
    category: /^[a-z0-9-]{1,48}$/.test(category) ? category : null,
    resolution: [8, 16, 32, 64, 128, 256, 512].includes(res) ? res : null,
    page: Math.min(1000, Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1)),
    limit: Math.min(50, Math.max(1, Number.parseInt(sp.get("limit") ?? "24", 10) || 24)),
    samples: sp.get("samples") === "1" || sp.get("samples") === "true",
  };
}

function order(p: ListParams): SQL[] {
  switch (p.sort) {
    case "downloads":
      return [desc(resources.downloadCount), desc(resources.publishedAt)];
    case "recent":
      return [desc(resources.publishedAt)];
    case "updated":
      return [desc(resources.updatedAt)];
    case "name":
      return [asc(sql`lower(${resources.name})`)];
    case "relevance":
      return p.q ? [sql`${relevance(p.q)} desc`, sql`${POPULARITY} desc`] : [sql`${POPULARITY} desc`];
    default:
      return [sql`${POPULARITY} desc`, desc(resources.publishedAt)];
  }
}

function summaryJson(r: ResourceCard, extra: string) {
  return {
    slug: r.slug,
    name: r.name,
    type: r.type,
    summary: r.summary,
    author: { name: r.authorName, username: r.ownerUsername, profile_url: `${SITE_URL}${creatorHref(r.ownerUsername)}` },
    resolution: r.resolution ? `${r.resolution}x` : null,
    mc_versions: r.mcVersions,
    categories: r.categories.map((c) => c.slug),
    downloads: r.downloadCount,
    featured: r.featured,
    is_sample: r.isSample,
    icon: abs(r.iconUrl ?? r.coverUrl),
    cover: abs(r.coverUrl),
    published_at: r.publishedAt,
    page_url: `${SITE_URL}${resourceHref(r.type, r.slug)}`,
    api_url: `${API}/${encodeURIComponent(r.slug)}${extra}`,
    download_api_url: `${API}/${encodeURIComponent(r.slug)}/download`,
  };
}

export async function listPacks(p: ListParams) {
  const db = await getDb();
  const where = and(
    eq(resources.status, "published"),
    p.type ? eq(resources.type, p.type) : inArray(resources.type, [...PACK_TYPES]),
    p.samples ? undefined : eq(resources.isSample, false),
    p.q ? textCondition(p.q) : undefined,
    p.version ? sql`${resources.mcVersions} @> array[${p.version}]::text[]` : undefined,
    p.resolution ? (p.resolution >= 128 ? sql`${resources.resolution} >= 128` : eq(resources.resolution, p.resolution)) : undefined,
    p.category
      ? sql`exists (select 1 from resource_categories rc join categories c on c.id = rc.category_id
          where rc.resource_id = ${resources.id} and c.slug = ${p.category})`
      : undefined,
    DOWNLOADABLE,
  );
  const [items, [{ n }]] = await Promise.all([
    selectCards(where, order(p), p.limit, (p.page - 1) * p.limit),
    db.select({ n: sql<number>`count(*)::int` }).from(resources).where(where),
  ]);
  const totalPages = Math.max(1, Math.ceil(n / p.limit));
  const qs = (page: number) => {
    const u = new URLSearchParams();
    if (p.q) u.set("q", p.q);
    if (p.sort !== (p.q ? "relevance" : "popular")) u.set("sort", p.sort);
    if (p.version) u.set("version", p.version);
    if (p.type) u.set("type", p.type);
    if (p.category) u.set("category", p.category);
    if (p.resolution) u.set("resolution", String(p.resolution));
    if (p.limit !== 24) u.set("limit", String(p.limit));
    if (p.samples) u.set("samples", "1");
    u.set("page", String(page));
    return `${API}?${u}`;
  };
  return {
    api_version: 1,
    query: { q: p.q || null, sort: p.sort, version: p.version, type: p.type, category: p.category, resolution: p.resolution, samples: p.samples },
    page: p.page,
    limit: p.limit,
    total: n,
    total_pages: totalPages,
    has_more: p.page < totalPages,
    next: p.page < totalPages ? qs(p.page + 1) : null,
    prev: p.page > 1 ? qs(Math.min(p.page - 1, totalPages)) : null,
    packs: items.map((r) => summaryJson(r, "")),
  };
}

// ------------------------------------------------------------------ detalle

async function packBySlug(slug: string): Promise<ResourceDetail | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const db = await getDb();
  const [row] = await db.select({ type: resources.type }).from(resources).where(eq(resources.slug, slug)).limit(1);
  if (!row || !PACK_TYPES.includes(row.type as PackType)) return null;
  return getResource(row.type, slug);
}

function versionJson(slug: string, v: ResourceDetail["versions"][number]) {
  const f = v.files.find((x) => x.scanStatus === "clean");
  return {
    version: v.versionNumber,
    channel: v.channel,
    mc_versions: v.mcVersions,
    changelog: v.changelog,
    published_at: v.publishedAt,
    downloads: v.downloadCount,
    file: f ? { name: f.fileName, size: f.sizeBytes, sha1: f.sha1 } : null,
    download_api_url: `${API}/${encodeURIComponent(slug)}/download?release=${encodeURIComponent(v.versionNumber)}`,
  };
}

export async function packDetail(slug: string) {
  const r = await packBySlug(slug);
  if (!r) return null;
  const versions = r.versions.filter((v) => v.files.some((f) => f.scanStatus === "clean"));
  if (!versions.length) return null;
  return {
    api_version: 1,
    slug: r.slug,
    name: r.name,
    type: r.type,
    summary: r.summary,
    description: r.description,
    author: {
      name: r.authorName,
      url: r.authorUrl,
      username: r.owner.username,
      display_name: r.owner.displayName,
      verified: r.owner.isVerified,
      profile_url: `${SITE_URL}${creatorHref(r.owner.username)}`,
    },
    permission: r.permissionNote,
    icon: abs(r.iconUrl ?? r.coverUrl ?? r.gallery[0]?.url),
    cover: abs(r.coverUrl),
    images: r.gallery.map((g) => ({ url: abs(g.url), width: g.width, height: g.height, caption: g.caption })),
    categories: r.categories.map((c) => ({ slug: c.slug, name: c.name })),
    resolution: r.resolution ? `${r.resolution}x` : null,
    mc_versions: r.mcVersions,
    downloads: r.downloadCount,
    favorites: r.favoriteCount,
    rating: r.ratingCount ? { average: Math.round((r.ratingSum / r.ratingCount) * 10) / 10, count: r.ratingCount } : null,
    featured: r.featured,
    is_sample: r.isSample,
    published_at: r.publishedAt,
    updated_at: r.updatedAt,
    latest_version: versions[0].versionNumber,
    versions: versions.map((v) => versionJson(r.slug, v)),
    page_url: `${SITE_URL}${resourceHref(r.type, r.slug)}`,
    download_api_url: `${API}/${encodeURIComponent(r.slug)}/download`,
  };
}

// ------------------------------------------------------------------ descarga

/**
 * Archivo a descargar: la versión más reciente publicada (o la que pida `release`), o la más
 * reciente compatible con la versión de Minecraft `mc`.
 */
export async function pickDownload(slug: string, opts: { mc: string | null; release: string | null }) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const db = await getDb();
  const rows = await db
    .select({
      resourceId: resources.id,
      slug: resources.slug,
      name: resources.name,
      type: resources.type,
      isSample: resources.isSample,
      authorName: resources.authorName,
      ownerUsername: profiles.username,
      versionId: resourceVersions.id,
      versionNumber: resourceVersions.versionNumber,
      mcVersions: resourceVersions.mcVersions,
      publishedAt: resourceVersions.publishedAt,
      fileId: resourceFiles.id,
      fileName: resourceFiles.fileName,
      storagePath: resourceFiles.storagePath,
      sizeBytes: resourceFiles.sizeBytes,
      sha1: resourceFiles.sha1,
      sha512: resourceFiles.sha512,
    })
    .from(resourceFiles)
    .innerJoin(resourceVersions, eq(resourceVersions.id, resourceFiles.versionId))
    .innerJoin(resources, eq(resources.id, resourceVersions.resourceId))
    .innerJoin(profiles, eq(profiles.id, resources.ownerId))
    .where(
      and(
        eq(resources.slug, slug),
        eq(resources.status, "published"),
        inArray(resources.type, [...PACK_TYPES]),
        isNotNull(resourceVersions.publishedAt),
        eq(resourceFiles.scanStatus, "clean"),
        opts.release ? eq(resourceVersions.versionNumber, opts.release) : undefined,
        opts.mc ? sql`${resourceVersions.mcVersions} @> array[${opts.mc}]::text[]` : undefined,
      ),
    )
    .orderBy(desc(resourceVersions.publishedAt), desc(resourceFiles.isPrimary))
    .limit(1);
  return rows[0] ?? null;
}

export function downloadJson(f: NonNullable<Awaited<ReturnType<typeof pickDownload>>>, counted: boolean) {
  return {
    api_version: 1,
    slug: f.slug,
    name: f.name,
    author: f.authorName,
    version: f.versionNumber,
    mc_versions: f.mcVersions,
    file_name: f.fileName,
    url: abs(fileUrl(f.storagePath)),
    size: f.sizeBytes,
    sha1: f.sha1,
    sha512: f.sha512,
    counted,
    is_sample: f.isSample,
  };
}

/** Para mensajes de error útiles: ¿existe el pack aunque no tenga versión para esa versión de Minecraft? */
export async function packExists(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return false;
  const db = await getDb();
  const [r] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.slug, slug), eq(resources.status, "published"), inArray(resources.type, [...PACK_TYPES])))
    .limit(1);
  return !!r;
}


