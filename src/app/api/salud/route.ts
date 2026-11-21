import { sql } from "drizzle-orm";
import { dbKind, getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** Estado del sitio: responde si la base de datos contesta y en cuánto tiempo. */
export async function GET() {
  const t = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: dbKind(), ms: Date.now() - t }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[salud]", e);
    return Response.json({ ok: false, db: dbKind(), ms: Date.now() - t }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
