import { buildModIndex, MOD_API_HEADERS } from "@/lib/queries/mod-api";
import { API_HEADERS, apiError, packDetail } from "@/lib/queries/public-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/packs/{slug}       → ficha completa del pack (nombre, autor, descripción, ícono,
 *                                   fotos, versiones, descargas)
 * GET /api/v1/packs/{slug}.json  → formato anterior del mod (se mantiene igual)
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/packs/[slug]">) {
  const { slug } = await ctx.params;
  if (slug.endsWith(".json")) {
    const pack = (await buildModIndex()).packs.find((p) => p.slug === slug.slice(0, -5));
    if (!pack) return Response.json({ error: "No existe ese pack." }, { status: 404, headers: MOD_API_HEADERS });
    return Response.json(pack, { headers: MOD_API_HEADERS });
  }
  try {
    const pack = await packDetail(decodeURIComponent(slug).toLowerCase());
    if (!pack) return apiError(404, "not_found", "No existe ese pack o todavía no tiene archivos para descargar.");
    return Response.json(pack, { headers: API_HEADERS });
  } catch (e) {
    console.error("[api packs/slug]", e);
    return apiError(500, "server_error", "No se pudo leer el pack. Intenta de nuevo.");
  }
}
