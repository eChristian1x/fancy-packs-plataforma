import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { galleryImages, resources } from "@/lib/db/schema";
import { BUCKET_IMAGES, publicUrl } from "@/lib/storage";
import { streamFrom } from "@/lib/stream-file";

export const dynamic = "force-dynamic";

/** packs/<slug>/gallery/<n>: captura n (desde 1) de la galería, para el mod. */
export async function GET(req: Request, ctx: RouteContext<"/packs/[slug]/gallery/[n]">) {
  const { slug, n } = await ctx.params;
  const i = Number.parseInt(n, 10);
  if (!Number.isFinite(i) || i < 1 || i > 50) return new Response("No existe.", { status: 404 });
  const db = await getDb();
  const rows = await db
    .select({ url: galleryImages.url })
    .from(galleryImages)
    .innerJoin(resources, eq(resources.id, galleryImages.resourceId))
    .where(and(eq(resources.slug, slug), eq(resources.status, "published")))
    .orderBy(asc(galleryImages.sortOrder))
    .limit(i);
  const url = rows[i - 1]?.url;
  if (!url) return new Response("No existe.", { status: 404 });
  return streamFrom(publicUrl(BUCKET_IMAGES, url), req, { "Cache-Control": "public, max-age=3600", "Content-Type": url.endsWith(".png") ? "image/png" : "image/webp" });
}
