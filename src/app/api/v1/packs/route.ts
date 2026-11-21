import { API_HEADERS, apiError, listPacks, parseListParams } from "@/lib/queries/public-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/packs → lista y búsqueda de texturas y overlays.
 *   q           texto (tolera acentos y errores de escritura)
 *   sort        popular (por omisión) · downloads · recent · updated · name · relevance (por omisión si hay q)
 *   version     versión de Minecraft, por ejemplo 1.21.11
 *   type        texture · overlay
 *   category    sword · crystal · nethpot… (las de /texturas)
 *   resolution  8 · 16 · 32 · 64 · 128
 *   page, limit página (desde 1) y tamaño (1–50, 24 por omisión)
 *   samples=1   incluye el contenido de ejemplo (para probar)
 */
export async function GET(req: Request) {
  try {
    const params = parseListParams(new URL(req.url).searchParams);
    return Response.json(await listPacks(params), { headers: API_HEADERS });
  } catch (e) {
    console.error("[api packs]", e);
    return apiError(500, "server_error", "No se pudo leer la lista. Intenta de nuevo.");
  }
}
