import { getToolPacks } from "@/lib/queries/tools";

/** Lista de packs que se pueden abrir en las herramientas. */
export async function GET() {
  const packs = await getToolPacks().catch(() => []);
  return Response.json({ packs }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
