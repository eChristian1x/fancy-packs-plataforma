import { getSessionUser } from "@/lib/auth/session";
import { recordDownload } from "@/lib/downloads";
import { findDownload } from "@/lib/queries/detail";
import { fileUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Descarga desde la web: registra la descarga y redirige al archivo.
 *   /descargar/<slug>                → archivo principal de la versión más reciente
 *   /descargar/<slug>?archivo=<id>   → un archivo concreto (versiones anteriores de mods)
 */
export async function GET(req: Request, ctx: RouteContext<"/descargar/[slug]">) {
  const { slug } = await ctx.params;
  const fileId = new URL(req.url).searchParams.get("archivo") ?? undefined;
  const f = await findDownload({ slug, fileId: fileId && /^[0-9a-f-]{36}$/i.test(fileId) ? fileId : undefined });
  if (!f) return new Response("Ese archivo no existe o todavía no se puede descargar.", { status: 404 });
  const user = await getSessionUser().catch(() => null);
  try {
    await recordDownload(req, { resourceId: f.resourceId, versionId: f.versionId, fileId: f.fileId, userId: user?.id, source: "web" });
  } catch (e) {
    console.error("[descarga]", e); // la descarga sigue aunque no se pueda contar
  }
  const url = fileUrl(f.storagePath);
  const target = url.startsWith("/") ? new URL(url, req.url) : new URL(`${url}?download=${encodeURIComponent(f.fileName)}`);
  return Response.redirect(target, 302);
}
