import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { downloads, resources, resourceVersions } from "@/lib/db/schema";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python-requests/i;

/** IP del visitante convertida en un hash: nunca se guarda la IP en claro. */
export function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
  return createHash("sha256").update(`${ip}|${process.env.DOWNLOAD_SALT ?? "fancy-packs"}`).digest("hex");
}

/**
 * Registra una descarga. La misma IP cuenta una sola vez por recurso cada 24 horas,
 * y los bots no cuentan. Devuelve si se contó.
 */
export async function recordDownload(
  req: Request,
  d: { resourceId: string; versionId: string; fileId: string; userId?: string | null; source: "web" | "mod" | "api" },
) {
  const ua = req.headers.get("user-agent") ?? "";
  if (d.source === "web" && BOT.test(ua)) return false;
  const db = await getDb();
  const hash = ipHash(req);
  const recent = await db
    .select({ id: downloads.id })
    .from(downloads)
    .where(and(eq(downloads.resourceId, d.resourceId), eq(downloads.ipHash, hash), gt(downloads.createdAt, sql`now() - interval '24 hours'`)))
    .limit(1);
  if (recent.length) {
    // Igual queda en el historial del usuario si tiene sesión
    if (d.userId) await db.insert(downloads).values({ ...d, ipHash: null, source: `${d.source}-rep` });
    return false;
  }
  await db.insert(downloads).values({ resourceId: d.resourceId, versionId: d.versionId, fileId: d.fileId, userId: d.userId ?? null, ipHash: hash, source: d.source });
  await Promise.all([
    db.update(resources).set({ downloadCount: sql`${resources.downloadCount} + 1` }).where(eq(resources.id, d.resourceId)),
    db.update(resourceVersions).set({ downloadCount: sql`${resourceVersions.downloadCount} + 1` }).where(eq(resourceVersions.id, d.versionId)),
  ]);
  return true;
}
