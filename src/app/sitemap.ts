import type { MetadataRoute } from "next";
import { getCategoryCounts } from "@/lib/queries/resources";
import { categoryHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// Páginas fijas, catálogos y categorías con contenido. Los packs y creadores se agregan en las etapas 4 y 6.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["", "/texturas", "/overlays", "/herramientas", "/ayuda/instalar", "/reglas"].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: (p === "" || p === "/texturas" || p === "/overlays" ? "daily" : "monthly") as "daily" | "monthly",
    priority: p === "" ? 1 : p.startsWith("/texturas") || p.startsWith("/overlays") ? 0.9 : 0.5,
  }));
  const cats = await getCategoryCounts().catch(() => []);
  const catUrls = cats
    .filter((c) => (c.type === "texture" || c.type === "overlay") && c.count > 0)
    .map((c) => ({ url: SITE_URL + categoryHref(c.type, c.slug), changeFrequency: "daily" as const, priority: 0.7 }));
  return [...fixed, ...catUrls];
}
