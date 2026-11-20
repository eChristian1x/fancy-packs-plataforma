import { buildModIndex, MOD_API_HEADERS } from "@/lib/queries/mod-api";

export const dynamic = "force-dynamic";

/** Lista completa de packs para el mod (mismo formato que el sitio anterior). */
export async function GET() {
  try {
    return Response.json(await buildModIndex(), { headers: MOD_API_HEADERS });
  } catch (e) {
    console.error("api/v1/packs.json", e);
    return Response.json({ error: "No se pudo leer la lista de packs." }, { status: 503 });
  }
}
