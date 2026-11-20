import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import { imageFeatures, profiles, resources } from "@/lib/db/schema";
import { cosine, FEATURE_SIZE } from "@/lib/image-features";
import { CACHE_TAG } from "./resources";

export type ToolPack = {
  slug: string;
  name: string;
  type: "texture" | "overlay";
  authorName: string;
  resolution: number | null;
  mcVersions: string[];
  coverUrl: string | null;
  isSample: boolean;
};

/** Packs publicados que las herramientas pueden abrir (texturas y overlays). */
export const getToolPacks = unstable_cache(
  async (): Promise<ToolPack[]> => {
    const db = await getDb();
    const rows = await db
      .select({
        slug: resources.slug,
        name: resources.name,
        type: resources.type,
        authorName: resources.authorName,
        resolution: resources.resolution,
        mcVersions: resources.mcVersions,
        coverUrl: resources.coverUrl,
        isSample: resources.isSample,
      })
      .from(resources)
      .where(and(eq(resources.status, "published"), inArray(resources.type, ["texture", "overlay"])))
      .orderBy(desc(resources.downloadCount))
      .limit(500);
    return rows as ToolPack[];
  },
  ["tool-packs"],
  { tags: [CACHE_TAG], revalidate: 120 },
);

type Vec = { resourceId: string; url: string; kind: string; vector: number[] };
/** Las huellas se centran (se les resta el promedio de todas) para que el fondo oscuro que comparten
 *  casi todas las capturas no haga que todo parezca igual de parecido. */
let memo: { at: number; rows: Vec[]; mean: number[] } | null = null;

function center(v: readonly number[], mean: readonly number[]) {
  const c = v.map((x, i) => x - (mean[i] ?? 0));
  const n = Math.hypot(...c) || 1;
  return c.map((x) => x / n);
}

/** Todas las huellas de imágenes de publicaciones publicadas (en memoria 5 minutos). */
async function allVectors(): Promise<Vec[]> {
  if (memo && Date.now() - memo.at < 5 * 60_000) return memo.rows;
  const db = await getDb();
  const rows = await db
    .select({ resourceId: imageFeatures.resourceId, url: imageFeatures.url, kind: imageFeatures.kind, vector: imageFeatures.vector })
    .from(imageFeatures)
    .innerJoin(resources, and(eq(resources.id, imageFeatures.resourceId), eq(resources.status, "published")));
  const valid = rows.filter((r) => r.vector.length === FEATURE_SIZE);
  const mean = Array.from({ length: FEATURE_SIZE }, (_, i) => (valid.length ? valid.reduce((a, r) => a + r.vector[i], 0) / valid.length : 0));
  memo = { at: Date.now(), mean, rows: valid.map((r) => ({ ...r, vector: valid.length > 4 ? center(r.vector, mean) : r.vector })) };
  return memo.rows;
}

export type ImageMatch = {
  slug: string;
  type: string;
  name: string;
  authorName: string;
  ownerUsername: string;
  resolution: number | null;
  coverUrl: string | null;
  matchedUrl: string;
  score: number;
  isSample: boolean;
};

/** Publicaciones cuyas imágenes más se parecen a la huella dada (una por publicación). */
export async function searchByVector(vector: number[], limit = 12): Promise<ImageMatch[]> {
  const rows = await allVectors();
  const q = rows.length > 4 && memo ? center(vector, memo.mean) : vector;
  const best = new Map<string, { score: number; url: string }>();
  for (const r of rows) {
    const s = cosine(q, r.vector);
    const cur = best.get(r.resourceId);
    if (!cur || s > cur.score) best.set(r.resourceId, { score: s, url: r.url });
  }
  const top = [...best.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, limit);
  if (!top.length) return [];
  const db = await getDb();
  const info = await db
    .select({
      id: resources.id,
      slug: resources.slug,
      type: resources.type,
      name: resources.name,
      authorName: resources.authorName,
      resolution: resources.resolution,
      coverUrl: resources.coverUrl,
      isSample: resources.isSample,
      ownerUsername: profiles.username,
    })
    .from(resources)
    .innerJoin(profiles, eq(profiles.id, resources.ownerId))
    .where(inArray(resources.id, top.map(([id]) => id)));
  return top
    .map(([id, m]) => {
      const r = info.find((x) => x.id === id);
      if (!r) return null;
      const { id: _id, ...rest } = r;
      return { ...rest, matchedUrl: m.url, score: m.score } as ImageMatch;
    })
    .filter((x): x is ImageMatch => x !== null);
}

export async function indexedImageCount() {
  return (await allVectors()).length;
}
