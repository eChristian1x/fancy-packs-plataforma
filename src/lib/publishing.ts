import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getDb } from "@/lib/db/client";
import { resourceCategories, resourceFiles, resourceVersions, resources } from "@/lib/db/schema";
import { refreshSearchText } from "@/lib/db/search";

/** Versiones de Minecraft y loaders de la publicación = unión de sus versiones (publicadas si ya está publicada). */
export async function syncCompat(resourceId: string, published: boolean) {
  const db = await getDb();
  const vs = await db
    .select({ mc: resourceVersions.mcVersions, loaders: resourceVersions.loaders })
    .from(resourceVersions)
    .where(and(eq(resourceVersions.resourceId, resourceId), published ? sql`${resourceVersions.publishedAt} is not null` : undefined));
  const mc = [...new Set(vs.flatMap((v) => v.mc))];
  const loaders = [...new Set(vs.flatMap((v) => v.loaders))];
  await db.update(resources).set({ mcVersions: mc, loaders }).where(eq(resources.id, resourceId));
}

export type Checklist = { key: string; label: string; done: boolean }[];

export async function checklistFor(resourceId: string): Promise<Checklist> {
  const db = await getDb();
  const [r] = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!r) return [];
  const [[cats], [vers]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(resourceCategories).where(eq(resourceCategories.resourceId, resourceId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(resourceVersions)
      .innerJoin(resourceFiles, and(eq(resourceFiles.versionId, resourceVersions.id), eq(resourceFiles.scanStatus, "clean")))
      .where(eq(resourceVersions.resourceId, resourceId)),
  ]);
  return [
    { key: "info", label: "Nombre y resumen", done: r.name.length >= 3 && r.summary.length >= 10 },
    { key: "cat", label: "Al menos una categoría", done: cats.n > 0 },
    { key: "cover", label: r.type === "mod" ? "Imagen de portada o ícono" : "Imagen de portada", done: !!r.coverUrl || (r.type === "mod" && !!r.iconUrl) },
    ...(r.type !== "mod" ? [{ key: "res", label: "Resolución", done: !!r.resolution }] : []),
    { key: "file", label: r.type === "mod" ? "Una versión con su .jar" : "Una versión con su .zip", done: vers.n > 0 },
  ];
}

/** Publica una publicación y sus versiones pendientes (lo usa también la administración). */
export async function publishNow(resourceId: string) {
  const db = await getDb();
  await db
    .update(resourceVersions)
    .set({ publishedAt: sql`now()` })
    .where(and(eq(resourceVersions.resourceId, resourceId), isNull(resourceVersions.publishedAt)));
  await db
    .update(resources)
    .set({ status: "published", rejectionReason: null, publishedAt: sql`coalesce(${resources.publishedAt}, now())`, updatedAt: sql`now()` })
    .where(eq(resources.id, resourceId));
  await syncCompat(resourceId, true);
  await refreshSearchText(db, [resourceId]);
  updateTag("resources");
}

/** Versión sugerida para la siguiente subida (1.0.0 → 1.0.1). */
export async function suggestNextVersion(resourceId: string) {
  const db = await getDb();
  const [last] = await db
    .select({ v: resourceVersions.versionNumber })
    .from(resourceVersions)
    .where(eq(resourceVersions.resourceId, resourceId))
    .orderBy(desc(resourceVersions.createdAt))
    .limit(1);
  if (!last) return "1.0.0";
  const m = last.v.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${last.v}-2`;
}
