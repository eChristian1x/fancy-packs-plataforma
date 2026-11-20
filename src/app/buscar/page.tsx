import type { Metadata } from "next";
import Link from "next/link";
import { ModCard } from "@/components/cards/ModCard";
import { TextureCard } from "@/components/cards/TextureCard";
import { Creators } from "@/components/home/Creators";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { PixelIcon, hasPixelIcon } from "@/components/ui/PixelIcon";
import { searchAll, type SearchResult } from "@/lib/queries/catalog";
import { getCategoryCounts } from "@/lib/queries/resources";
import { categoryHref, TYPE_PATH } from "@/lib/routes";
import styles from "./page.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const readQ = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? "").trim().slice(0, 80);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQ((await searchParams).q);
  return { title: q ? `Buscar “${q}”` : "Buscar", robots: { index: false, follow: true } };
}

const GROUP = {
  texture: { title: "Texturas", one: "textura", many: "texturas", catalog: true },
  overlay: { title: "Overlays", one: "overlay", many: "overlays", catalog: true },
  mod: { title: "Mods", one: "mod", many: "mods", catalog: false },
  skin: { title: "Skins", one: "skin", many: "skins", catalog: false },
  other: { title: "Otros", one: "recurso", many: "recursos", catalog: false },
} as const;

export default async function Buscar({ searchParams }: Props) {
  const q = readQ((await searchParams).q);
  let result: SearchResult | null = null;
  let failed = false;
  if (q) {
    try {
      result = await searchAll(q);
    } catch (e) {
      console.error("[buscar]", e);
      failed = true;
    }
  }
  const total = result ? result.groups.reduce((n, g) => n + g.total, 0) + result.creators.length : 0;

  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <h1>{q ? <>Resultados para “{q}”</> : "Buscar"}</h1>
        <form role="search" aria-label="Buscar en Fancy Packs" action="/buscar" className={styles.buscar}>
          <Icon name="search" size={22} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nombre del pack, creador o modalidad"
            aria-label="Buscar packs, mods o creadores"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={80}
            autoFocus={!q}
          />
          <button type="submit" className="boton boton-principal">
            Buscar
          </button>
        </form>
        {result && total > 0 && (
          <p className={styles.resumen} role="status">
            {result.groups
              .filter((g) => g.total)
              .map((g) => `${g.total} ${g.total === 1 ? GROUP[g.type].one : GROUP[g.type].many}`)
              .concat(result.creators.length ? [`${result.creators.length} ${result.creators.length === 1 ? "creador" : "creadores"}`] : [])
              .join(", ")}
          </p>
        )}
      </header>

      {!q && <Suggestions />}
      {failed && <EmptyState tone="error" title="No se pudo buscar." body="La base de datos no respondió. Intenta de nuevo en unos segundos." />}
      {result && total === 0 && (
        <>
          <EmptyState
            title={`Nada coincide con “${q}”.`}
            body="Revisa cómo está escrito, busca por modalidad (Sword, Crystal, UHC…) o recorre el catálogo."
            action={{ href: "/texturas", label: "Ver todas las texturas" }}
          />
          <Suggestions />
        </>
      )}

      {result?.groups
        .filter((g) => g.total)
        .map((g) => {
          const cfg = GROUP[g.type];
          const more = cfg.catalog && g.total > g.items.length;
          return (
            <section key={g.type} className={styles.grupo} aria-labelledby={`g-${g.type}`}>
              <SectionHeader
                size="s"
                id={`g-${g.type}`}
                title={`${cfg.title} (${g.total})`}
                action={more ? { href: `${TYPE_PATH[g.type]}?q=${encodeURIComponent(q)}`, label: `Ver las ${g.total} ${cfg.many}` } : undefined}
              />
              <ul className={g.type === "mod" ? styles.mods : styles.cards}>
                {g.items.map((r) => (
                  <li key={r.id}>{g.type === "mod" ? <ModCard r={r} /> : <TextureCard r={r} />}</li>
                ))}
              </ul>
            </section>
          );
        })}

      {result && result.creators.length > 0 && (
        <section className={styles.grupo} aria-labelledby="g-creadores">
          <SectionHeader size="s" id="g-creadores" title={`Creadores (${result.creators.length})`} />
          <div className={styles.creadores}>
            <Creators items={result.creators.map((c) => ({ ...c, isSample: false }))} />
          </div>
        </section>
      )}
    </div>
  );
}

/** Atajos cuando no hay búsqueda o no hubo resultados: las modalidades con packs. */
async function Suggestions() {
  const cats = (await getCategoryCounts().catch(() => [])).filter((c) => c.type === "texture" && c.count > 0);
  if (!cats.length) return null;
  return (
    <section className={styles.sugerencias} aria-labelledby="sug">
      <h2 id="sug">Explora por modalidad</h2>
      <ul>
        {cats.map((c) => (
          <li key={c.slug}>
            <Link href={categoryHref("texture", c.slug)} className={styles.sug}>
              {hasPixelIcon(c.icon) && <PixelIcon name={c.icon} size={18} />}
              {c.name}
              <span className="num">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
