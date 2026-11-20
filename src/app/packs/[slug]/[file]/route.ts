import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { resources } from "@/lib/db/schema";
import { recordDownload } from "@/lib/downloads";
import { findDownload } from "@/lib/queries/detail";
import { publicUrl, BUCKET_IMAGES, fileUrl } from "@/lib/storage";
import { streamFrom } from "@/lib/stream-file";

export const dynamic = "force-dynamic";

/**
 * Rutas que usa el mod "Fancy Packs · Texturas" (las mismas que en el sitio anterior):
 *   packs/<slug>/<archivo>.zip   descarga (se cuenta como "mod")
 *   packs/<slug>/icon            ícono del pack
 * Se sirven los bytes directamente, sin redirección.
 */
export async function GET(req: Request, ctx: RouteContext<"/packs/[slug]/[file]">) {
  const { slug, file } = await ctx.params;
  if (file === "icon") {
    const db = await getDb();
    const [r] = await db
      .select({ icon: resources.iconUrl, cover: resources.coverUrl })
      .from(resources)
      .where(and(eq(resources.slug, slug), eq(resources.status, "published")))
      .limit(1);
    const img = r?.icon ?? r?.cover;
    if (!img) return new Response("Sin ícono.", { status: 404 });
    return streamFrom(publicUrl(BUCKET_IMAGES, img), req, { "Cache-Control": "public, max-age=3600", "Content-Type": img.endsWith(".png") ? "image/png" : "image/webp" });
  }
  const f = await findDownload({ slug, fileName: decodeURIComponent(file) });
  if (!f) return new Response("No existe ese archivo.", { status: 404 });
  try {
    await recordDownload(req, { resourceId: f.resourceId, versionId: f.versionId, fileId: f.fileId, source: "mod" });
  } catch (e) {
    console.error("[descarga mod]", e);
  }
  return streamFrom(fileUrl(f.storagePath), req, {
    "Content-Type": f.fileName.endsWith(".jar") ? "application/java-archive" : "application/zip",
    "Content-Disposition": `attachment; filename="${f.fileName.replace(/"/g, "")}"`,
    "Cache-Control": "no-store",
  });
}
