"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { PixelIcon, hasPixelIcon } from "@/components/ui/PixelIcon";
import { Icon } from "@/components/ui/Icon";
import {
  activeFilterCount,
  catalogHref,
  SORTS,
  toggle,
  type CatalogQuery,
  type ResKey,
  type Sort,
} from "@/lib/catalog-params";
import type { FacetOption } from "@/lib/queries/catalog";
import styles from "./CatalogShell.module.css";

type Props = {
  base: string;
  query: CatalogQuery;
  facets: { categorias: FacetOption[]; versiones: FacetOption[]; res: FacetOption[] };
  total: number;
  totalAll: number;
  unit: { one: string; many: string };
  searchPlaceholder: string;
  children: React.ReactNode;
};

const VISIBLE_VERSIONS = 8;

/**
 * Parte interactiva del catálogo. Todo cambio de filtro es un cambio de URL:
 * con JavaScript se navega sin recargar (y se atenúan los resultados mientras llegan);
 * sin JavaScript, los formularios y enlaces hacen lo mismo con una recarga normal.
 */
export function CatalogShell({ base, query, facets, total, totalAll, unit, searchPlaceholder, children }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const go = (change: Partial<CatalogQuery>) => start(() => router.push(catalogHref(base, query, change), { scroll: false }));
  const link = (change: Partial<CatalogQuery>) => ({
    href: catalogHref(base, query, change),
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      go(change);
    },
  });

  const [q, setQ] = useState(query.q);
  useEffect(() => setQ(query.q), [query.q]);

  // En pantallas angostas la fila de categorías se desliza: mostrar la elegida.
  const catsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = catsRef.current;
    const on = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (row && on) row.scrollLeft = Math.max(0, on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2);
  }, [query.categorias]);

  const nFilters = activeFilterCount(query);
  // El botón de la hoja cuenta solo los filtros que están dentro de la hoja (no las categorías).
  const nSheet = query.res.length + query.versiones.length + (query.creador ? 1 : 0);
  const word = total === 1 ? unit.one : unit.many;
  const countText = total === totalAll && !query.q && !nFilters ? `${total} ${word}` : `${total} de ${totalAll} ${unit.many}`;

  // Filtros activos, cada uno con su enlace para quitarlo
  const catName = (s: string) => facets.categorias.find((c) => c.value === s)?.label ?? s;
  const resName = (k: string) => facets.res.find((r) => r.value === k)?.label ?? k;
  const chips = [
    ...(query.q ? [{ key: "q", label: `“${query.q}”`, change: { q: "" } }] : []),
    ...query.categorias.map((c) => ({ key: `c-${c}`, label: catName(c), change: { categorias: query.categorias.filter((x) => x !== c) } })),
    ...query.res.map((r) => ({ key: `r-${r}`, label: resName(r), change: { res: query.res.filter((x) => x !== r) } })),
    ...query.versiones.map((v) => ({ key: `v-${v}`, label: `Minecraft ${v}`, change: { versiones: query.versiones.filter((x) => x !== v) } })),
    ...(query.creador ? [{ key: "cr", label: `Creador: ${query.creador}`, change: { creador: "" } }] : []),
  ];
  const clearAll: Partial<CatalogQuery> = { q: "", categorias: [], versiones: [], res: [], creador: "" };

  return (
    <div className={styles.shell}>
      {/* ---------- búsqueda */}
      <form
        role="search"
        aria-label={`Buscar ${unit.many}`}
        action={base}
        className={styles.buscar}
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim(), orden: q.trim() ? "relevancia" : "populares" });
        }}
      >
        <Icon name="search" size={20} />
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={`Buscar ${unit.many} por nombre o creador`}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
        />
        <HiddenFilters query={query} omit={["q"]} />
        <button type="submit" className="boton boton-principal boton-chico">
          Buscar
        </button>
      </form>

      {/* ---------- categorías (modalidades) */}
      <nav aria-label="Categorías" className={styles.categorias} ref={catsRef}>
        <ul>
          <li>
            <a {...link({ categorias: [] })} aria-current={!query.categorias.length ? "true" : undefined} className={styles.cat}>
              Todas
            </a>
          </li>
          {facets.categorias.map((c) => {
            const on = query.categorias.includes(c.value);
            return (
              <li key={c.value}>
                <a
                  {...link({ categorias: toggle(query.categorias, c.value) })}
                  aria-current={on ? "true" : undefined}
                  className={styles.cat}
                  data-vacia={!on && c.count === 0 ? "" : undefined}
                >
                  {hasPixelIcon(c.icon) && <PixelIcon name={c.icon} size={18} />}
                  {c.label}
                  <span className={`${styles.n} num`}>{c.count}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.cuerpo}>
        <aside className={styles.lateral} aria-label="Filtros">
          <Filters base={base} query={query} facets={facets} go={go} link={link} />
        </aside>

        <div className={styles.resultados}>
          <div className={styles.barra}>
            <p className={styles.cuenta} role="status" aria-live="polite">
              <b className="num">{countText}</b>
            </p>
            <button
              type="button"
              className={`boton boton-secundario boton-chico ${styles.abrirFiltros}`}
              onClick={() => dialogRef.current?.showModal()}
              aria-haspopup="dialog"
            >
              <Icon name="filter" />
              Filtros{nSheet ? ` (${nSheet})` : ""}
            </button>
            <form action={base} className={styles.orden}>
              <label htmlFor="orden">Ordenar</label>
              <select id="orden" name="orden" value={query.orden} onChange={(e) => go({ orden: e.target.value as Sort })}>
                {(Object.keys(SORTS) as Sort[])
                  .filter((s) => s !== "relevancia" || query.q)
                  .map((s) => (
                    <option key={s} value={s}>
                      {SORTS[s]}
                    </option>
                  ))}
              </select>
              <HiddenFilters query={query} omit={["orden"]} />
              <noscript>
                <button type="submit" className="boton boton-secundario boton-chico">
                  Ordenar
                </button>
              </noscript>
            </form>
          </div>

          {chips.length > 0 && (
            <ul className={styles.activos} aria-label="Filtros activos">
              {chips.map((c) => (
                <li key={c.key}>
                  <a {...link(c.change)} className={styles.activo} aria-label={`Quitar filtro ${c.label}`}>
                    {c.label}
                    <Icon name="close" size={14} />
                  </a>
                </li>
              ))}
              {chips.length > 1 && (
                <li>
                  <a {...link(clearAll)} className={styles.limpiar}>
                    Quitar todos
                  </a>
                </li>
              )}
            </ul>
          )}

          <div className={styles.lista} data-pending={pending || undefined} aria-busy={pending}>
            {children}
          </div>
        </div>
      </div>

      {/* ---------- filtros en móvil */}
      <dialog ref={dialogRef} className={styles.hoja} aria-label="Filtros" onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}>
        <div className={styles.hojaCabeza}>
          <h2>Filtros</h2>
          <button type="button" className={styles.cerrar} onClick={() => dialogRef.current?.close()}>
            <Icon name="close" size={22} />
            <span className="solo-lectores">Cerrar filtros</span>
          </button>
        </div>
        <div className={styles.hojaCuerpo}>
          <Filters base={base} query={query} facets={facets} go={go} link={link} />
        </div>
        <div className={styles.hojaPie}>
          <button type="button" className="boton boton-principal" onClick={() => dialogRef.current?.close()}>
            {pending ? "Actualizando…" : `Ver ${total} ${word}`}
          </button>
        </div>
      </dialog>
    </div>
  );
}

/** Mantiene los demás filtros cuando un formulario se envía sin JavaScript. */
function HiddenFilters({ query, omit }: { query: CatalogQuery; omit: (keyof CatalogQuery)[] }) {
  const f: [string, string][] = [];
  if (!omit.includes("q") && query.q) f.push(["q", query.q]);
  if (!omit.includes("categorias") && query.categorias.length) f.push(["categoria", query.categorias.join(",")]);
  if (!omit.includes("versiones") && query.versiones.length) f.push(["version", query.versiones.join(",")]);
  if (!omit.includes("res") && query.res.length) f.push(["res", query.res.join(",")]);
  if (!omit.includes("creador") && query.creador) f.push(["creador", query.creador]);
  if (!omit.includes("orden")) f.push(["orden", query.orden]);
  return (
    <>
      {f.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

function Filters({
  base,
  query,
  facets,
  go,
  link,
}: {
  base: string;
  query: CatalogQuery;
  facets: Props["facets"];
  go: (c: Partial<CatalogQuery>) => void;
  link: (c: Partial<CatalogQuery>) => { href: string; onClick: (e: React.MouseEvent) => void };
}) {
  const id = useId();
  const [allVersions, setAllVersions] = useState(false);
  const [creador, setCreador] = useState(query.creador);
  useEffect(() => setCreador(query.creador), [query.creador]);

  // Aplicar el filtro de creador al dejar de escribir
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCreador = (v: string) => {
    setCreador(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ creador: v.trim() }), 450);
  };

  const versions = facets.versiones.filter((v) => v.count > 0 || query.versiones.includes(v.value));
  const hidden = versions.length - VISIBLE_VERSIONS;
  const shownVersions = allVersions ? versions : versions.slice(0, VISIBLE_VERSIONS);
  const n = activeFilterCount(query);

  return (
    <form action={base} className={styles.filtros} onSubmit={(e) => e.preventDefault()}>
      <HiddenFilters query={query} omit={["res", "versiones", "creador"]} />

      <div className={styles.grupo}>
        <label htmlFor={`${id}-creador`} className={styles.titulo}>
          Creador
        </label>
        <div className={styles.campo}>
          <Icon name="user" size={16} />
          <input
            id={`${id}-creador`}
            name="creador"
            type="search"
            value={creador}
            onChange={(e) => onCreador(e.target.value)}
            placeholder="Nombre del creador"
            autoComplete="off"
            maxLength={48}
          />
        </div>
      </div>

      <fieldset className={styles.grupo}>
        <legend className={styles.titulo}>Resolución</legend>
        <ul className={styles.opciones}>
          {facets.res.map((o) => (
            <Check
              key={o.value}
              name="res"
              option={o}
              checked={query.res.includes(o.value as ResKey)}
              onChange={() => go({ res: toggle(query.res, o.value as ResKey) })}
            />
          ))}
        </ul>
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend className={styles.titulo}>Versión de Minecraft</legend>
        {versions.length ? (
          <ul className={styles.opciones} id={`${id}-versiones`}>
            {shownVersions.map((o) => (
              <Check
                key={o.value}
                name="version"
                option={o}
                checked={query.versiones.includes(o.value)}
                onChange={() => go({ versiones: toggle(query.versiones, o.value) })}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.nada}>Ninguna versión coincide.</p>
        )}
        {hidden > 0 && (
          <button
            type="button"
            className={styles.mas}
            aria-expanded={allVersions}
            aria-controls={`${id}-versiones`}
            onClick={() => setAllVersions((v) => !v)}
          >
            {allVersions ? "Mostrar menos" : `Mostrar ${hidden} más`}
          </button>
        )}
      </fieldset>

      <noscript>
        <button type="submit" className="boton boton-principal boton-chico">
          Aplicar filtros
        </button>
      </noscript>

      {n > 0 && (
        <a {...link({ categorias: [], versiones: [], res: [], creador: "" })} className={styles.limpiar}>
          Quitar filtros ({n})
        </a>
      )}
    </form>
  );
}

function Check({ name, option, checked, onChange }: { name: string; option: FacetOption; checked: boolean; onChange: () => void }) {
  const disabled = !checked && option.count === 0;
  return (
    <li>
      <label className={styles.check} data-disabled={disabled || undefined}>
        <input type="checkbox" name={name} value={option.value} checked={checked} disabled={disabled} onChange={onChange} />
        <span className={styles.caja} aria-hidden="true">
          <Icon name="check" size={13} />
        </span>
        <span className={styles.etiqueta}>{option.label}</span>
        <span className={`${styles.n} num`}>{option.count}</span>
      </label>
    </li>
  );
}
