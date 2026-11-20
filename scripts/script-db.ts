/** Conexión para los scripts de línea de comandos (migraciones, datos de ejemplo). */
import fs from "node:fs";
import path from "node:path";
import * as schema from "../src/lib/db/schema";
import type { Db } from "../src/lib/db/client";

const MIGRATIONS = path.join(process.cwd(), "drizzle");

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) process.loadEnvFile(p);
  }
}

export async function openScriptDb(): Promise<{ db: Db; migrate: () => Promise<void>; close: () => Promise<void>; kind: "postgres" | "pglite" }> {
  loadEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { prepare: false, max: 1 });
    const db = drizzle(client, { schema });
    return { db, kind: "postgres", migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }), close: () => client.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = await PGlite.create(dir, { extensions: { pg_trgm } });
  const db = drizzle(client, { schema });
  return {
    db: db as unknown as Db,
    kind: "pglite",
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }),
    close: () => client.close(),
  };
}
