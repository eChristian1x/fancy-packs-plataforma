/**
 * Conexión a la base de datos.
 * - Con DATABASE_URL (Supabase u otro Postgres): usa postgres.js.
 * - Sin DATABASE_URL: usa PGlite, un Postgres embebido que guarda los datos en .data/pglite.
 *   Sirve para desarrollar sin crear cuentas; en producción siempre se usa DATABASE_URL.
 */
import path from "node:path";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

type Holder = { db?: Db; ready?: Promise<Db>; kind?: "postgres" | "pglite" };
const g = globalThis as typeof globalThis & { __fancyDb?: Holder };
const holder: Holder = (g.__fancyDb ??= {});

export const LOCAL_DB_DIR = path.join(process.cwd(), ".data", "pglite");

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    /*
     * node-postgres + attachDatabasePool (Vercel Fluid compute): las conexiones que quedan sin
     * usar se cierran antes de que la instancia se suspenda. Con un cliente persistente
     * (postgres.js) las conexiones quedaban colgadas cuando el pooler de Supabase las cerraba
     * y las consultas esperaban hasta el límite de 300 s de la función.
     * Drizzle con pg no usa sentencias preparadas con nombre, así que funciona con el
     * "transaction pooler" de Supabase.
     */
    // TLS siempre que no sea local. Se quita sslmode de la URL porque pg lo interpreta como
    // "verificar el certificado" y el del pooler de Supabase está firmado por su propia CA.
    const u = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
    u.searchParams.delete("sslmode");
    const pool = new Pool({
      connectionString: u.toString(),
      ssl: local || process.env.DATABASE_SSL === "off" ? undefined : { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 8_000,
      // Corta del lado del cliente cualquier consulta que tarde más de 20 s: mejor un error
      // que una página colgada.
      query_timeout: 20_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (e) => console.error("[db] conexión cerrada por el servidor:", e.message));
    attachDatabasePool(pool);
    holder.kind = "postgres";
    return drizzlePg(pool, { schema });
  }
  // En Vercel el disco es de solo lectura: PGlite no sirve ahí.
  if (process.env.VERCEL || process.env.REQUIRE_DATABASE_URL === "1") {
    throw new Error("Falta DATABASE_URL. Configúrala en las variables de entorno del proyecto.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const client = await PGlite.create(LOCAL_DB_DIR, { extensions: { pg_trgm } });
  holder.kind = "pglite";
  return drizzlePglite(client, { schema }) as unknown as Db;
}

/** Devuelve la conexión (una sola por proceso). */
export function getDb(): Promise<Db> {
  if (holder.db) return Promise.resolve(holder.db);
  holder.ready ??= connect().then((db) => (holder.db = db));
  return holder.ready;
}

export function dbKind() {
  return holder.kind ?? (process.env.DATABASE_URL ? "postgres" : "pglite");
}

export { schema };
