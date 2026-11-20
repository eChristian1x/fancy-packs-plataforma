import { buildModIndex, MOD_API_HEADERS } from "@/lib/queries/mod-api";

export const dynamic = "force-dynamic";

/** Un solo pack: /api/v1/packs/<slug>.json */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/packs/[file]">) {
  const { file } = await ctx.params;
  const slug = file.replace(/\.json$/, "");
  const pack = (await buildModIndex()).packs.find((p) => p.slug === slug);
  if (!pack) return Response.json({ error: "No existe ese pack." }, { status: 404, headers: MOD_API_HEADERS });
  return Response.json(pack, { headers: MOD_API_HEADERS });
}
