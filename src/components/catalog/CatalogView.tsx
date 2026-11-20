import type { Metadata } from "next";
import { TextureCard } from "@/components/cards/TextureCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { activeFilterCount, catalogHref, parseCatalogQuery, type CatalogQuery, type CatalogType } from "@/lib/catalog-params";
import { getCatalog, type CatalogResult } from "@/lib/queries/catalog";
import { getCategoryCounts } from "@/lib/queries/resources";
import { Breadcrumbs } from "./Breadcrumbs";
import { CatalogShell } from "./CatalogShell";
import { Pagination } from "./Pagination";
import styles from "./CatalogView.module.css";

type SP = Promise<Record<string, string | string[] | undefined>>;

export const CATALOG = {
  texture: {
    base: "/texturas",
    title: "Texturas",
    unit: { one: "textura", many: "texturas" },
    description: "Resource packs para PvP y supervivencia. Filtra por modalidad, resolución y versión de Minecraft.",
    placeholder: "Buscar texturas por nombre o creador",
    none: "Todavía no hay texturas publicadas.",
    meta: (cat?: string) => (cat ? `Texturas ${cat} para Minecraft PvP` : "Texturas PvP para Minecraft"),
  },
  overlay: {
    base: "/overlays",
    title: "Overlays",
    unit: { one: "overlay", many: "overlays" },
    description: "Cambios pequeños que se ponen encima de tu pack: fuego bajo, escudos, tótems, cielo y más.",
    placeholder: "Buscar overlays por nombre o creador",
    none: "Todavía no hay overlays publicados.",
    meta: (cat?: string) => (cat ? `Overlays de ${cat.toLowerCase()} para Minecraft` : "Overlays para Minecraft PvP"),
  },
} as const;

/** Metadatos: título por categoría y solo las vistas "limpias" se indexan. */
export async function catalogMetadata(type: CatalogType, searchParams: SP): Promise<Metadata> {
  const cfg = CATALOG[type];
  const query = parseCatalogQuery(await searchParams);
  const cats = (await getCategoryCounts().catch(() => [])).filter((c) => c.type === type);
  const cat = query.categorias.length === 1 ? cats.find((c) => c.slug === query.categorias[0]) : undefined;
  const clean = !query.q && !query.creador && !query.versiones.length && !query.res.length && query.categorias.length <= 1;
  const canonical = catalogHref(cfg.base, { ...query, q: "", creador: "", versiones: [], res: [], orden: "populares", categorias: cat ? [cat.slug] : [] }, { pagina: query.pagina });
  return {
    title: cfg.meta(cat?.name),
    description: cat?.description ?? cfg.description,
    alternates: { canonical },
    robots: clean ? undefined : { index: false, follow: true },
  };
}

export async function CatalogView({ type, searchParams }: { type: CatalogType; searchParams: SP }) {
  const cfg = CATALOG[type];
  const query = parseCatalogQuery(await searchParams);
  let result: CatalogResult | null = null;
  try {
    result = await getCatalog(type, query);
  } catch (e) {
    console.error(`[catálogo ${type}]`, e);
  }

  const cat = result?.category;
  const crumbs = [
    { href: "/", label: "Inicio" },
    { href: cfg.base, label: cfg.title },
    ...(cat ? [{ href: `${cfg.base}?categoria=${cat.slug}`, label: cat.name }] : []),
  ];

  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <Breadcrumbs items={crumbs} />
        <h1>{cat ? (type === "texture" ? `Texturas ${cat.name}` : cat.name) : cfg.title}</h1>
        <p>{cat?.description ?? cfg.description}</p>
      </header>

      {result ? (
        <CatalogShell
          base={cfg.base}
          query={query}
          facets={result.facets}
          total={result.total}
          totalAll={result.totalAll}
          unit={cfg.unit}
          searchPlaceholder={cfg.placeholder}
        >
          <Results type={type} query={query} result={result} />
        </CatalogShell>
      ) : (
        <EmptyState
          tone="error"
          title={`No se pudo cargar el catálogo de ${cfg.unit.many}.`}
          body="La base de datos no respondió. Recarga la página en unos segundos."
        />
      )}
    </div>
  );
}

function Results({ type, query, result }: { type: CatalogType; query: CatalogQuery; result: CatalogResult }) {
  const cfg = CATALOG[type];
  if (!result.total) {
    if (!result.totalAll) {
      return (
        <EmptyState
          title={cfg.none}
          body="Cuando un creador publique, aparece aquí."
          action={{ href: "/publicar", label: "Publicar el primero" }}
        />
      );
    }
    const filtered = activeFilterCount(query) > 0 || !!query.q;
    return (
      <EmptyState
        title={query.q ? `Nada coincide con “${query.q}”.` : `Ningún resultado con estos filtros.`}
        body={filtered ? "Quita algún filtro o busca con otras palabras." : undefined}
        action={{ href: cfg.base, label: "Quitar todos los filtros" }}
      />
    );
  }
  return (
    <>
      <h2 className="solo-lectores">Resultados, página {result.page} de {result.pages}</h2>
      <ul className={styles.grid}>
        {result.items.map((r, i) => (
          <li key={r.id}>
            <TextureCard r={r} variant="catalogo" priority={i < 3 && result.page === 1} />
          </li>
        ))}
      </ul>
      <Pagination base={cfg.base} query={query} page={result.page} pages={result.pages} />
    </>
  );
}
