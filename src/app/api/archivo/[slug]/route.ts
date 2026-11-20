import { findDownload } from "@/lib/queries/detail";
import { fileUrl } from "@/lib/storage";
import { streamFrom } from "@/lib/stream-file";

export const dynamic = "force-dynamic";

/**
 * El .zip de un pack desde el mismo dominio, para que las herramientas lo abran en el navegador
 * (visor, comparador, personalizador). No cuenta como descarga.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/archivo/[slug]">) {
  const { slug } = await ctx.params;
  const f = await findDownload({ slug });
  if (!f || f.type === "mod" || !f.fileName.endsWith(".zip")) return new Response("No existe.", { status: 404 });
  if (f.sizeBytes > 50 * 1024 * 1024) return new Response("Demasiado grande.", { status: 413 });
  return streamFrom(fileUrl(f.storagePath), req, { "Content-Type": "application/zip", "Cache-Control": "public, max-age=300" });
}
