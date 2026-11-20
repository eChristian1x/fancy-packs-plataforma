/**
 * Parámetros del catálogo en la URL. Todo el estado de filtros vive en la URL para que
 * cualquier búsqueda se pueda compartir, guardar o abrir en otra pestaña.
 *
 *   /texturas?q=fresa&categoria=sword,crystal&version=1.21.11&res=16,32&creador=kuro&orden=descargas&pagina=2
 *
 * Este archivo lo usan el servidor y el navegador: no toca la base de datos.
 */

export const CATALOG_TYPES = ["texture", "overlay", "mod"] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];

export const SORTS = {
  populares: "Populares",
  descargas: "Más descargados",
  recientes: "Más recientes",
  relevancia: "Más relevantes",
} as const;
export type Sort = keyof typeof SORTS;

/** Grupos de resolución (el brief pide 16x, 32x, 64x y 128x o más; 8x para packs ligeros). */
export const RES_BUCKETS = [
  { key: "8", label: "8x o menos" },
  { key: "16", label: "16x" },
  { key: "32", label: "32x" },
  { key: "64", label: "64x" },
  { key: "128", label: "128x o más" },
] as const;
export type ResKey = (typeof RES_BUCKETS)[number]["key"];

export const LOADERS = [
  { key: "fabric", label: "Fabric" },
  { key: "forge", label: "Forge" },
  { key: "neoforge", label: "NeoForge" },
  { key: "quilt", label: "Quilt" },
] as const;
export type LoaderKey = (typeof LOADERS)[number]["key"];

export const PAGE_SIZE = 24;
const MAX_Q = 80;

export type CatalogQuery = {
  q: string;
  creador: string;
  categorias: string[];
  versiones: string[];
  res: ResKey[];
  loaders: LoaderKey[];
  orden: Sort;
  pagina: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) =>
  [...new Set((Array.isArray(v) ? v.join(",") : v ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 20);

/** Lee y limpia los parámetros. Los valores desconocidos se ignoran (no rompen la página). */
export function parseCatalogQuery(sp: RawParams): CatalogQuery {
  const q = one(sp.q).trim().slice(0, MAX_Q);
  const creador = one(sp.creador).trim().slice(0, 48);
  const ordenRaw = one(sp.orden) as Sort;
  const orden: Sort = ordenRaw in SORTS && (ordenRaw !== "relevancia" || q) ? ordenRaw : q ? "relevancia" : "populares";
  const pagina = Math.max(1, Math.min(1000, Number.parseInt(one(sp.pagina), 10) || 1));
  const resKeys = RES_BUCKETS.map((b) => b.key as string);
  return {
    q,
    creador,
    categorias: list(sp.categoria).filter((s) => /^[a-z0-9-]{1,48}$/.test(s)),
    versiones: list(sp.version).filter((s) => /^[0-9][0-9a-z.+-]{0,23}$/i.test(s)),
    res: list(sp.res).filter((s): s is ResKey => resKeys.includes(s)),
    loaders: list(sp.loader).filter((s): s is LoaderKey => LOADERS.some((l) => l.key === s)),
    orden,
    pagina,
  };
}

/** Construye la URL del catálogo con cambios. Cualquier cambio de filtro vuelve a la página 1. */
export function catalogHref(base: string, query: CatalogQuery, change: Partial<CatalogQuery> = {}) {
  const next = { ...query, ...change };
  if (!("pagina" in change)) next.pagina = 1;
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.categorias.length) p.set("categoria", next.categorias.join(","));
  if (next.versiones.length) p.set("version", next.versiones.join(","));
  if (next.res.length) p.set("res", next.res.join(","));
  if (next.loaders.length) p.set("loader", next.loaders.join(","));
  if (next.creador) p.set("creador", next.creador);
  const defaultSort = next.q ? "relevancia" : "populares";
  if (next.orden !== defaultSort && (next.orden !== "relevancia" || next.q)) p.set("orden", next.orden);
  if (next.pagina > 1) p.set("pagina", String(next.pagina));
  const s = p.toString().replace(/%2C/g, ",");
  return s ? `${base}?${s}` : base;
}

export function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function activeFilterCount(q: CatalogQuery) {
  return q.categorias.length + q.versiones.length + q.res.length + q.loaders.length + (q.creador ? 1 : 0);
}
