/**
 * Conexión a la base de datos.
 * - Con DATABASE_URL (Supabase u otro Postgres): usa postgres.js.
 * - Sin DATABASE_URL: usa PGlite, un Postgres embebido que guarda los datos en .data/pglite.
 *   Sirve para desarrollar sin crear cuentas; en producción siempre se usa DATABASE_URL.
 */
import path from "node:path";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

type Holder = { db?: Db; ready?: Promise<Db>; kind?: "postgres" | "pglite" };
const g = globalThis as typeof globalThis & { __fancyDb?: Holder };
const holder: Holder = (g.__fancyDb ??= {});

export const LOCAL_DB_DIR = path.join(process.cwd(), ".data", "pglite");

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    // prepare:false es necesario con el "transaction pooler" de Supabase.
    const client = postgres(url, { prepare: false, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    holder.kind = "postgres";
    return drizzlePostgres(client, { schema });
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
