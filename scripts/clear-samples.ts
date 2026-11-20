/** Borra todo el contenido de ejemplo (is_sample = true). Los datos reales no se tocan. */
import { eq } from "drizzle-orm";
import * as s from "../src/lib/db/schema";
import { openScriptDb } from "./script-db";

async function main() {
  const { db, close } = await openScriptDb();
  const r = await db.delete(s.resources).where(eq(s.resources.isSample, true)).returning({ id: s.resources.id });
  const p = await db.delete(s.profiles).where(eq(s.profiles.isSample, true)).returning({ id: s.profiles.id });
  console.log(`Borrados ${r.length} recursos y ${p.length} perfiles de ejemplo.`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
