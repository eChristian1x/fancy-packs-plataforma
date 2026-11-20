import { buildModIndex, MOD_API_HEADERS } from "@/lib/queries/mod-api";

export const dynamic = "force-dynamic";

/** Misma lista como script (window.FANCY_PACKS), por compatibilidad con el sitio anterior. */
export async function GET() {
  const body = `window.FANCY_PACKS = ${JSON.stringify(await buildModIndex())};\n`;
  return new Response(body, { headers: { ...MOD_API_HEADERS, "Content-Type": "text/javascript; charset=utf-8" } });
}
