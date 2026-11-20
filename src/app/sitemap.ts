import type { MetadataRoute } from "next";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profiles, resources } from "@/lib/db/schema";
import { getCategoryCounts } from "@/lib/queries/resources";
import { categoryHref, creatorHref, resourceHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/** Páginas fijas, catálogos, categorías, packs, mods, creadores y herramientas. Sin contenido de ejemplo. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: Entry[] = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...["/texturas", "/overlays", "/mods"].map((p) => ({ url: SITE_URL + p, changeFrequency: "daily" as const, priority: 0.9 })),
    ...["/herramientas", "/comunidad", "/publicar", "/ayuda/instalar", "/reglas"].map((p) => ({ url: SITE_URL + p, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...TOOLS.map((t) => ({ url: `${SITE_URL}/herramientas/${t.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
  const cats = await getCategoryCounts().catch(() => []);
  const catUrls: Entry[] = cats
    .filter((c) => (c.type === "texture" || c.type === "overlay" || c.type === "mod") && c.count > 0)
    .map((c) => ({ url: SITE_URL + categoryHref(c.type, c.slug), changeFrequency: "daily", priority: 0.7 }));

  let items: Entry[] = [];
  let people: Entry[] = [];
  try {
    const db = await getDb();
    const [rs, ps] = await Promise.all([
      db
        .select({ type: resources.type, slug: resources.slug, updatedAt: resources.updatedAt })
        .from(resources)
        .where(and(eq(resources.status, "published"), eq(resources.isSample, false)))
        .limit(20000),
      db
        .select({ username: profiles.username, updatedAt: profiles.updatedAt })
        .from(profiles)
        .where(
          and(
            eq(profiles.isSample, false),
            eq(profiles.isBanned, false),
            sql`exists (select 1 from resources r where r.owner_id = ${profiles.id} and r.status = 'published')`,
          ),
        )
        .limit(5000),
    ]);
    items = rs.map((r) => ({ url: SITE_URL + resourceHref(r.type, r.slug), lastModified: r.updatedAt, changeFrequency: "weekly", priority: 0.8 }));
    people = ps.map((p) => ({ url: SITE_URL + creatorHref(p.username), lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.6 }));
  } catch (e) {
    console.error("[sitemap]", e);
  }
  return [...fixed, ...catUrls, ...items, ...people];
}
