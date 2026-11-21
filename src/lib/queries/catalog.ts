import "server-only";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import { categories, mcVersions, profiles, resourceCategories, resources, type ResourceType } from "@/lib/db/schema";
import { LOADERS, PAGE_SIZE, RES_BUCKETS, type CatalogQuery, type ResKey } from "@/lib/catalog-params";
import { versionSortKey } from "@/lib/versions";
import { CACHE_TAG, selectCards, type ResourceCard } from "./resources";

// ------------------------------------------------------------------ condiciones

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

/** Cada palabra tiene que aparecer (o parecerse: tolera errores de escritura). */
export function textCondition(q: string): SQL | undefined {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!terms.length) return undefined;
  return and(
    ...terms.map(
      (t) =>
        sql`(${resources.searchText} like '%' || fp_normalize(${likeEscape(t)}) || '%'
          or (length(${t}) >= 4 and word_similarity(fp_normalize(${t}), ${resources.searchText}) >= 0.5))`,
    ),
  );
}

export function relevance(q: string): SQL {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!terms.length) return sql`0`;
  return sql.join(
    terms.map(
      (t) =>
        sql`(word_similarity(fp_normalize(${t}), ${resources.searchText})
          + case when fp_normalize(${resources.name}) like '%' || fp_normalize(${likeEscape(t)}) || '%' then 1 else 0 end)`,
    ),
    sql` + `,
  );
}

const RES_SQL: Record<ResKey, SQL> = {
  "8": sql`${resources.resolution} <= 8`,
  "16": sql`${resources.resolution} = 16`,
  "32": sql`${resources.resolution} = 32`,
  "64": sql`${resources.resolution} = 64`,
  "128": sql`${resources.resolution} >= 128`,
};

const RES_BUCKET_SQL = sql<string>`case
  when ${resources.resolution} <= 8 then '8'
  when ${resources.resolution} >= 128 then '128'
  else ${resources.resolution}::text end`;

type Facet = "categorias" | "versiones" | "res" | "loaders";

/** Condiciones de la consulta. `except` deja fuera un filtro para contar sus opciones. */
function conditions(type: ResourceType, q: CatalogQuery, except?: Facet): SQL {
  const c: (SQL | undefined)[] = [eq(resources.status, "published"), eq(resources.type, type)];
  if (q.q) c.push(textCondition(q.q));
  if (q.creador) {
    const v = likeEscape(q.creador);
    c.push(sql`(fp_normalize(${resources.authorName}) like '%' || fp_normalize(${v}) || '%'
      or exists (select 1 from profiles p where p.id = ${resources.ownerId} and lower(p.username) = lower(${q.creador})))`);
  }
  if (except !== "categorias" && q.categorias.length) {
    c.push(sql`exists (select 1 from resource_categories rc join categories c on c.id = rc.category_id
      where rc.resource_id = ${resources.id} and c.type = ${type} and c.slug in (${sql.join(q.categorias.map((s) => sql`${s}`), sql`, `)}))`);
  }
  if (except !== "versiones" && q.versiones.length) {
    c.push(sql`${resources.mcVersions} && array[${sql.join(q.versiones.map((v) => sql`${v}`), sql`, `)}]::text[]`);
  }
  if (type !== "mod" && except !== "res" && q.res.length) {
    c.push(sql`(${sql.join(q.res.map((k) => RES_SQL[k]), sql` or `)})`);
  }
  if (type === "mod" && except !== "loaders" && q.loaders.length) {
    c.push(sql`${resources.loaders} && array[${sql.join(q.loaders.map((l) => sql`${l}`), sql`, `)}]::mod_loader[]`);
  }
  return and(...c)!;
}

/**
 * "Populares": descargas totales ponderadas por antigüedad, para que un pack nuevo que ya
 * se descarga mucho suba por encima de uno viejo. Cuando haya registro de descargas (etapa 4)
 * se puede cambiar por "descargas de los últimos 30 días".
 */
export const POPULARITY = sql`(${resources.downloadCount} + 5 * ${resources.favoriteCount})
  / power(greatest(extract(epoch from (now() - ${resources.publishedAt})) / 86400, 0) + 2, 0.7)`;

function orderBy(q: CatalogQuery): SQL[] {
  switch (q.orden) {
    case "descargas":
      return [desc(resources.downloadCount), desc(resources.publishedAt)];
    case "recientes":
      return [desc(resources.publishedAt)];
    case "relevancia":
      return [sql`${relevance(q.q)} desc`, sql`${POPULARITY} desc`];
    default:
      return [sql`${POPULARITY} desc`, desc(resources.publishedAt)];
  }
}

// ------------------------------------------------------------------ consulta principal

export type FacetOption = { value: string; label: string; count: number; icon?: string | null };

export type CatalogResult = {
  items: ResourceCard[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  /** Total del tipo sin filtros (para "4 de 16 texturas") */
  totalAll: number;
  facets: { categorias: FacetOption[]; versiones: FacetOption[]; res: FacetOption[]; loaders: FacetOption[] };
  /** Descripción de la categoría si hay exactamente una seleccionada */
  category: { slug: string; name: string; description: string | null } | null;
};

async function run(type: ResourceType, q: CatalogQuery): Promise<CatalogResult> {
  const db = await getDb();
  const where = conditions(type, q);
  const count = async (w: SQL) => (await db.select({ n: sql<number>`count(*)::int` }).from(resources).where(w))[0].n;

  const isMod = type === "mod";
  const [total, totalAll, catRows, verRows, resRows, versions, loaderRows] = await Promise.all([
    count(where),
    count(and(eq(resources.status, "published"), eq(resources.type, type))!),
    db
      .select({ slug: categories.slug, name: categories.name, icon: categories.icon, description: categories.description, n: sql<number>`count(${resources.id})::int` })
      .from(categories)
      .leftJoin(resourceCategories, eq(resourceCategories.categoryId, categories.id))
      .leftJoin(resources, and(eq(resources.id, resourceCategories.resourceId), conditions(type, q, "categorias")))
      .where(eq(categories.type, type))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder)),
    db
      .select({ v: sql<string>`v`, n: sql<number>`count(*)::int` })
      .from(sql`${resources}, unnest(${resources.mcVersions}) as v`)
      .where(conditions(type, q, "versiones"))
      .groupBy(sql`v`),
    isMod
      ? Promise.resolve([] as { b: string; n: number }[])
      : db
          .select({ b: RES_BUCKET_SQL, n: sql<number>`count(*)::int` })
          .from(resources)
          .where(and(conditions(type, q, "res"), sql`${resources.resolution} is not null`))
          .groupBy(RES_BUCKET_SQL),
    db.select({ id: mcVersions.id }).from(mcVersions),
    isMod
      ? db
          .select({ l: sql<string>`l::text`, n: sql<number>`count(*)::int` })
          .from(sql`${resources}, unnest(${resources.loaders}) as l`)
          .where(conditions(type, q, "loaders"))
          .groupBy(sql`l`)
      : Promise.resolve([] as { l: string; n: number }[]),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(q.pagina, pages);
  const items = total ? await selectCards(where, orderBy(q), PAGE_SIZE, (page - 1) * PAGE_SIZE) : [];

  const verCount = new Map(verRows.map((r) => [r.v, r.n]));
  // Versiones de la tabla mc_versions, más las que tengan packs aunque no estén en la tabla.
  const allVersions = [...new Set([...versions.map((v) => v.id), ...verCount.keys()])].sort(
    (a, b) => versionSortKey(b) - versionSortKey(a),
  );
  const resCount = new Map(resRows.map((r) => [r.b, r.n]));
  const selectedCat = q.categorias.length === 1 ? catRows.find((c) => c.slug === q.categorias[0]) : undefined;

  return {
    items,
    total,
    totalAll,
    page,
    pages,
    pageSize: PAGE_SIZE,
    facets: {
      categorias: catRows.map((c) => ({ value: c.slug, label: c.name, icon: c.icon, count: c.n })),
      versiones: allVersions.map((v) => ({ value: v, label: v, count: verCount.get(v) ?? 0 })),
      res: isMod ? [] : RES_BUCKETS.map((b) => ({ value: b.key, label: b.label, count: resCount.get(b.key) ?? 0 })),
      loaders: isMod ? LOADERS.map((l) => ({ value: l.key, label: l.label, count: loaderRows.find((r) => r.l === l.key)?.n ?? 0 })) : [],
    },
    category: selectedCat ? { slug: selectedCat.slug, name: selectedCat.name, description: selectedCat.description } : null,
  };
}

export const getCatalog = unstable_cache(run, ["catalog"], { tags: [CACHE_TAG], revalidate: 60 });

// ------------------------------------------------------------------ búsqueda global

export type CreatorHit = { username: string; displayName: string; resources: number; downloads: number };

export type SearchResult = {
  q: string;
  groups: { type: ResourceType; total: number; items: ResourceCard[] }[];
  creators: CreatorHit[];
};

const EMPTY_QUERY = (q: string): CatalogQuery => ({ q, creador: "", categorias: [], versiones: [], res: [], loaders: [], orden: "relevancia", pagina: 1 });

async function search(q: string): Promise<SearchResult> {
  const db = await getDb();
  const query = EMPTY_QUERY(q);
  const types: { type: ResourceType; limit: number }[] = [
    { type: "texture", limit: 8 },
    { type: "overlay", limit: 4 },
    { type: "mod", limit: 6 },
  ];
  const groups = await Promise.all(
    types.map(async ({ type, limit }) => {
      const where = conditions(type, query);
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(resources).where(where);
      const items = n ? await selectCards(where, orderBy(query), limit) : [];
      return { type, total: n, items };
    }),
  );

  const terms = q.split(/\s+/).filter(Boolean).slice(0, 4);
  const nameText = sql`fp_normalize(${profiles.displayName} || ' ' || ${profiles.username})`;
  const creators = terms.length
    ? await db
        .select({
          username: profiles.username,
          displayName: profiles.displayName,
          resources: sql<number>`count(${resources.id})::int`,
          downloads: sql<number>`coalesce(sum(${resources.downloadCount}), 0)::bigint`,
        })
        .from(profiles)
        .innerJoin(resources, and(eq(resources.ownerId, profiles.id), eq(resources.status, "published")))
        .where(
          and(
            ...terms.map(
              (t) => sql`(${nameText} like '%' || fp_normalize(${likeEscape(t)}) || '%'
                or (length(${t}) >= 4 and word_similarity(fp_normalize(${t}), ${nameText}) >= 0.5))`,
            ),
          ),
        )
        .groupBy(profiles.id)
        .orderBy(desc(sql`sum(${resources.downloadCount})`))
        .limit(6)
    : [];

  return { q, groups, creators: creators.map((c) => ({ ...c, downloads: Number(c.downloads) })) };
}

export const searchAll = unstable_cache(search, ["search"], { tags: [CACHE_TAG], revalidate: 60 });
