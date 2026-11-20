/**
 * Galería, archivos descargables, dependencias y huellas visuales del contenido de ejemplo
 * (scripts/samples/manifest.json). Se puede correr las veces que sea: reemplaza lo de ejemplo.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import manifestJson from "../../scripts/samples/manifest.json";
import type { Db } from "./db/client";
import * as s from "./db/schema";

type FileInfo = { path: string; name: string; size: number; sha1: string; sha512: string };
type Entry = {
  kind: "texture" | "overlay" | "mod";
  gallery: string[];
  file?: FileInfo;
  versionFiles?: Record<string, FileInfo>;
  deps?: { name: string; url: string }[];
  features: { url: string; kind: string; vector: number[] }[];
};
export type Manifest = Record<string, Entry>;

export function loadManifest(): Manifest {
  return manifestJson as unknown as Manifest;
}

export async function seedSampleAssets(db: Db) {
  const manifest = loadManifest();
  const rows = await db
    .select({ id: s.resources.id, slug: s.resources.slug })
    .from(s.resources)
    .where(and(eq(s.resources.isSample, true), inArray(s.resources.slug, Object.keys(manifest))));
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  const versions = await db
    .select({ id: s.resourceVersions.id, resourceId: s.resourceVersions.resourceId, number: s.resourceVersions.versionNumber, publishedAt: s.resourceVersions.publishedAt })
    .from(s.resourceVersions)
    .where(inArray(s.resourceVersions.resourceId, ids));
  const vIds = versions.map((v) => v.id);

  await db.delete(s.galleryImages).where(inArray(s.galleryImages.resourceId, ids));
  await db.delete(s.imageFeatures).where(inArray(s.imageFeatures.resourceId, ids));
  if (vIds.length) {
    await db.delete(s.resourceFiles).where(inArray(s.resourceFiles.versionId, vIds));
    await db.delete(s.dependencies).where(inArray(s.dependencies.versionId, vIds));
  }

  for (const r of rows) {
    const m = manifest[r.slug];
    const vs = versions.filter((v) => v.resourceId === r.id).sort((a, b) => +new Date(b.publishedAt ?? 0) - +new Date(a.publishedAt ?? 0));
    if (m.gallery.length) await db.insert(s.galleryImages).values(m.gallery.map((url, i) => ({ resourceId: r.id, url, width: 960, height: 600, sortOrder: i })));
    if (m.features.length) await db.insert(s.imageFeatures).values(m.features.map((f) => ({ resourceId: r.id, url: f.url, kind: f.kind, vector: f.vector })));
    const files: { versionId: string; f: FileInfo }[] = [];
    if (m.file && vs[0]) files.push({ versionId: vs[0].id, f: m.file });
    for (const v of vs) if (m.versionFiles?.[v.number]) files.push({ versionId: v.id, f: m.versionFiles[v.number] });
    if (files.length)
      await db.insert(s.resourceFiles).values(
        files.map(({ versionId, f }) => ({ versionId, storagePath: f.path, fileName: f.name, sizeBytes: f.size, sha1: f.sha1, sha512: f.sha512, isPrimary: true, scanStatus: "clean" })),
      );
    if (m.deps?.length && vs.length)
      await db.insert(s.dependencies).values(vs.flatMap((v) => m.deps!.map((d) => ({ versionId: v.id, externalName: d.name, externalUrl: d.url, kind: "required" }))));
  }
  await db.execute(sql`select 1`);
  return rows.length;
}
