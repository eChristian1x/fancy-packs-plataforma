/**
 * Prepara la base de datos:
 *   1. aplica las migraciones de /drizzle
 *   2. carga los datos de referencia (categorías, versiones de Minecraft, ajustes)
 *   3. carga el contenido de ejemplo si la base está vacía y es local, o si pasas --seed
 *
 * Uso: npm run db:setup        (lo corre `npm run dev` antes de arrancar)
 *      npm run db:seed         (fuerza el contenido de ejemplo, también en Supabase)
 */
import { sql } from "drizzle-orm";
import * as s from "../src/lib/db/schema";
import { refreshSearchText } from "../src/lib/db/search";
import { seedSampleAssets } from "../src/lib/sample-assets";
import { openScriptDb } from "./script-db";
import {
  CATEGORIES,
  MC_VERSIONS,
  SAMPLE_CREATORS,
  SAMPLE_IMAGE,
  SAMPLE_RESOURCES,
  SITE_SETTINGS,
  versionSortKey,
} from "./seed-data";

const forceSamples = process.argv.includes("--seed");

async function main() {
  const { db, migrate, close, kind } = await openScriptDb();
  await migrate();

  // ---- referencia (idempotente)
  for (const [key, value] of Object.entries(SITE_SETTINGS)) {
    await db.insert(s.siteSettings).values({ key, value }).onConflictDoNothing();
  }
  for (const v of MC_VERSIONS) {
    await db
      .insert(s.mcVersions)
      .values({ id: v.id, releasedAt: v.releasedAt ?? null, sortKey: versionSortKey(v.id), isFeatured: !!v.featured })
      .onConflictDoNothing();
  }
  CATEGORIES.forEach((c, i) => (c as { sortOrder?: number }).sortOrder = i);
  for (const c of CATEGORIES) {
    await db
      .insert(s.categories)
      .values({ ...c, sortOrder: (c as { sortOrder?: number }).sortOrder ?? 0 })
      .onConflictDoNothing();
  }

  // Texto de búsqueda al día (barato e idempotente)
  await refreshSearchText(db);

  // ---- ejemplo
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.resources);
  const wantSamples = forceSamples || (kind === "pglite" && n === 0);
  if (!wantSamples) {
    if (kind === "pglite") await seedSampleAssets(db);
    console.log(`Base lista (${kind}). ${n} recursos.`);
    await close();
    return;
  }
  const already = await db.select({ n: sql<number>`count(*)::int` }).from(s.resources).where(sql`${s.resources.isSample}`);
  if (already[0].n > 0) {
    const n = await seedSampleAssets(db);
    console.log(`El contenido de ejemplo ya estaba cargado (archivos y galerías de ${n} recursos actualizados).`);
    await close();
    return;
  }

  const cats = await db.select().from(s.categories);
  const catId = (type: string, slug: string) => {
    const c = cats.find((x) => x.type === type && x.slug === slug);
    if (!c) throw new Error(`Categoría desconocida: ${type}/${slug}`);
    return c.id;
  };

  const owners = new Map<string, string>();
  for (const c of SAMPLE_CREATORS) {
    const [row] = await db
      .insert(s.profiles)
      .values({ ...c, role: "creator", isSample: true })
      .returning({ id: s.profiles.id });
    owners.set(c.username, row.id);
  }

  const day = 864e5;
  for (const r of SAMPLE_RESOURCES) {
    const ownerId = owners.get(r.owner)!;
    const creator = SAMPLE_CREATORS.find((c) => c.username === r.owner)!;
    const published = new Date(Date.now() - r.daysAgo * day - 3600e3 * (r.downloads % 11));
    const img = `${SAMPLE_IMAGE[r.type]}/${r.slug}.webp`;
    const [row] = await db
      .insert(s.resources)
      .values({
        type: r.type,
        slug: r.slug,
        name: r.name,
        summary: r.summary,
        description: r.summary,
        ownerId,
        authorName: creator.displayName,
        resolution: r.resolution ?? null,
        mcVersions: r.versions,
        loaders: r.loaders ?? [],
        status: "published",
        featured: !!r.featured,
        isSample: true,
        coverUrl: r.type === "mod" ? null : img,
        iconUrl: r.type === "mod" ? img : null,
        downloadCount: r.downloads,
        publishedAt: published,
        createdAt: published,
        updatedAt: published,
      })
      .returning({ id: s.resources.id });
    await db.insert(s.resourceCategories).values(r.categories.map((c) => ({ resourceId: row.id, categoryId: catId(r.type, c) })));
    const history = r.versionHistory ?? [{ number: "1.0.0", daysAgo: r.daysAgo, changelog: "Primera versión." }];
    for (const v of history) {
      await db.insert(s.resourceVersions).values({
        resourceId: row.id,
        versionNumber: v.number,
        changelog: v.changelog,
        mcVersions: r.versions,
        loaders: r.loaders ?? [],
        publishedAt: new Date(Date.now() - v.daysAgo * day),
      });
    }
  }
  await refreshSearchText(db);
  await seedSampleAssets(db);
  console.log(`Contenido de ejemplo cargado: ${SAMPLE_CREATORS.length} creadores, ${SAMPLE_RESOURCES.length} recursos.`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
