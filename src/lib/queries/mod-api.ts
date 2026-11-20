import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  galleryImages,
  resourceCategories,
  resourceFiles,
  resourceVersions,
  resources,
} from "@/lib/db/schema";
import { getSiteInfo } from "./resources";

/**
 * Formato de /api/v1/packs.json, idéntico al que generaba scripts/build.py en el sitio anterior.
 * Lo lee el mod "Fancy Packs · Texturas", así que no se cambia: solo se agregan campos nuevos.
 *
 * Reglas:
 * - Solo packs reales (nunca los de ejemplo), publicados, de tipo textura u overlay,
 *   con un archivo principal revisado (scan_status = 'clean').
 * - Las URLs son relativas a la raíz del sitio, como antes ("packs/<slug>/<archivo>.zip").
 *   Esas rutas las sirve la app y registran la descarga (etapa 4).
 */
export type ModPack = {
  slug: string;
  name: string;
  author: string;
  author_url: string | null;
  permission: string;
  description: string;
  long_description: string | null;
  resolution: string | null;
  mc_versions: string[];
  tags: string[];
  featured: boolean;
  icon: string | null;
  gallery: string[];
  download: { url: string; filename: string; size: number; sha1: string; sha512: string };
  created: string;
  updated: string;
};

export async function buildModIndex() {
  const db = await getDb();
  const site = await getSiteInfo();
  const rows = await db
    .select({
      id: resources.id,
      slug: resources.slug,
      name: resources.name,
      authorName: resources.authorName,
      authorUrl: resources.authorUrl,
      permissionNote: resources.permissionNote,
      summary: resources.summary,
      description: resources.description,
      resolution: resources.resolution,
      mcVersions: resources.mcVersions,
      featured: resources.featured,
      iconUrl: resources.iconUrl,
      coverUrl: resources.coverUrl,
      createdAt: resources.publishedAt,
      updatedAt: resources.updatedAt,
    })
    .from(resources)
    .where(and(eq(resources.status, "published"), eq(resources.isSample, false), inArray(resources.type, ["texture", "overlay"])))
    .orderBy(desc(resources.updatedAt));

  const ids = rows.map((r) => r.id);
  const [files, tags, gallery] = ids.length
    ? await Promise.all([
        db
          .select({
            resourceId: resourceVersions.resourceId,
            fileName: resourceFiles.fileName,
            sizeBytes: resourceFiles.sizeBytes,
            sha1: resourceFiles.sha1,
            sha512: resourceFiles.sha512,
            publishedAt: resourceVersions.publishedAt,
          })
          .from(resourceFiles)
          .innerJoin(resourceVersions, eq(resourceVersions.id, resourceFiles.versionId))
          .where(and(inArray(resourceVersions.resourceId, ids), eq(resourceFiles.isPrimary, true), eq(resourceFiles.scanStatus, "clean")))
          .orderBy(desc(resourceVersions.publishedAt)),
        db
          .select({ resourceId: resourceCategories.resourceId, slug: categories.slug })
          .from(resourceCategories)
          .innerJoin(categories, eq(categories.id, resourceCategories.categoryId))
          .where(inArray(resourceCategories.resourceId, ids)),
        db
          .select({ resourceId: galleryImages.resourceId, sortOrder: galleryImages.sortOrder })
          .from(galleryImages)
          .where(inArray(galleryImages.resourceId, ids))
          .orderBy(galleryImages.sortOrder),
      ])
    : [[], [], []];

  const packs: ModPack[] = [];
  for (const r of rows) {
    const file = files.find((f) => f.resourceId === r.id); // el más reciente
    if (!file) continue;
    const g = gallery.filter((x) => x.resourceId === r.id);
    const base = `packs/${r.slug}`;
    packs.push({
      slug: r.slug,
      name: r.name,
      author: r.authorName,
      author_url: r.authorUrl,
      permission: r.permissionNote ?? "Publicado por su creador",
      description: r.summary,
      long_description: r.description && r.description !== r.summary ? r.description : null,
      resolution: r.resolution ? `${r.resolution}x` : null,
      mc_versions: r.mcVersions,
      tags: tags.filter((t) => t.resourceId === r.id).map((t) => t.slug),
      featured: r.featured,
      icon: r.iconUrl || r.coverUrl ? `${base}/icon` : g.length ? `${base}/gallery/1` : null,
      gallery: g.map((_, i) => `${base}/gallery/${i + 1}`),
      download: { url: `${base}/${file.fileName}`, filename: file.fileName, size: file.sizeBytes, sha1: file.sha1, sha512: file.sha512 },
      created: (r.createdAt ?? r.updatedAt).toISOString(),
      updated: r.updatedAt.toISOString(),
    });
  }
  return {
    api_version: 1,
    generated: new Date().toISOString(),
    site: { name: site.name, tagline: site.tagline, contact: site.contact },
    count: packs.length,
    packs,
  };
}

export const MOD_API_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
  "Access-Control-Allow-Origin": "*",
};
