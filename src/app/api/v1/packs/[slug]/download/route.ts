import { getSessionUser } from "@/lib/auth/session";
import { recordDownload } from "@/lib/downloads";
import { API_NO_STORE, apiError, downloadJson, packExists, pickDownload } from "@/lib/queries/public-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/packs/{slug}/download → enlace directo del .zip, tamaño y hashes.
 *   ?version=1.21.11   la versión más reciente del pack compatible con esa versión de Minecraft
 *   ?release=2.0.0     una versión concreta del pack
 * Cada llamada cuenta como descarga (origen "mod"): la misma IP una vez por pack cada 24 h.
 * Llámala justo antes de bajar el archivo, no para mostrar listas.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/packs/[slug]/download">) {
  const slug = decodeURIComponent((await ctx.params).slug).toLowerCase();
  const sp = new URL(req.url).searchParams;
  const mc = (sp.get("version") ?? "").trim();
  const release = (sp.get("release") ?? "").trim();
  if (mc && !/^[0-9][0-9a-z.\-]{0,15}$/i.test(mc)) return apiError(400, "bad_version", "La versión de Minecraft no es válida (ejemplo: 1.21.11).");
  if (release && !/^[0-9A-Za-z][0-9A-Za-z.+_-]{0,31}$/.test(release)) return apiError(400, "bad_release", "La versión del pack no es válida.");
  try {
    const f = await pickDownload(slug, { mc: mc || null, release: release || null });
    if (!f) {
      if (!(await packExists(slug))) return apiError(404, "not_found", "No existe ese pack.");
      if (mc) return apiError(404, "no_compatible_version", `Este pack no tiene una versión para Minecraft ${mc}.`);
      return apiError(404, "no_file", release ? `No existe la versión ${release} de este pack.` : "Este pack todavía no tiene archivos para descargar.");
    }
    let counted = false;
    try {
      const user = await getSessionUser().catch(() => null);
      counted = await recordDownload(req, { resourceId: f.resourceId, versionId: f.versionId, fileId: f.fileId, userId: user?.id, source: "mod" });
    } catch (e) {
      console.error("[api descarga] no se pudo contar", e);
    }
    return Response.json(downloadJson(f, counted), { headers: API_NO_STORE });
  } catch (e) {
    console.error("[api descarga]", e);
    return apiError(500, "server_error", "No se pudo preparar la descarga. Intenta de nuevo.");
  }
}
