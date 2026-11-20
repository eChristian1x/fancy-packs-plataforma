"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, PVP_SLOTS, pngUrl, texturesOf, type Category, type LoadedPack, type Texture } from "@/lib/pack-reader";
import { versionRange } from "@/lib/versions";
import { PackPicker } from "./PackPicker";
import styles from "./Tools.module.css";

type Side = { pack: LoadedPack; tex: Map<string, Texture>; res: number | null };

function side(pack: LoadedPack): Side {
  const list = texturesOf(pack);
  const tex = new Map(list.map((t) => [t.key, t]));
  const items = list.filter((t) => t.category === "Objetos" && !t.animated);
  const w = new Map<number, number>();
  items.forEach((t) => w.set(t.width, (w.get(t.width) ?? 0) + 1));
  return { pack, tex, res: [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null };
}

const same = (a: Uint8Array, b: Uint8Array) => a.byteLength === b.byteLength && a.every((x, i) => x === b[i]);

/** Dos packs lado a lado: las mismas texturas juntas, aunque uno sea de 1.8 y el otro de 1.21. */
export function PackComparator() {
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const [view, setView] = useState<"pvp" | "ambos" | "soloA" | "soloB">("pvp");
  const [cat, setCat] = useState<Category | "Todas">("Todas");
  const urls = useMemo(() => new Map<string, string>(), [a, b]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const url = (s: Side, t: Texture) => {
    const k = `${s === a ? "a" : "b"}:${t.path}`;
    let u = urls.get(k);
    if (!u) urls.set(k, (u = pngUrl(s.pack.files.get(t.path)!)));
    return u;
  };

  const data = useMemo(() => {
    if (!a || !b) return null;
    const keys = [...new Set([...a.tex.keys(), ...b.tex.keys()])].sort();
    const both = keys.filter((k) => a.tex.has(k) && b.tex.has(k));
    const onlyA = keys.filter((k) => a.tex.has(k) && !b.tex.has(k));
    const onlyB = keys.filter((k) => !a.tex.has(k) && b.tex.has(k));
    const pvp = both.filter((k) => PVP_SLOTS.slice(0, 9).some((s) => s.match(k)));
    const identical = both.filter((k) => same(a.pack.files.get(a.tex.get(k)!.path)!, b.pack.files.get(b.tex.get(k)!.path)!)).length;
    return { both, onlyA, onlyB, pvp, identical };
  }, [a, b]);

  const keys = data ? { pvp: data.pvp, ambos: data.both, soloA: data.onlyA, soloB: data.onlyB }[view] : [];
  const catOf = (k: string) => (a?.tex.get(k) ?? b?.tex.get(k))!.category;
  const shown = keys.filter((k) => cat === "Todas" || catOf(k) === cat).slice(0, 300);

  return (
    <>
      <div className={styles.dos}>
        <PackPicker label="Pack A" onLoad={(p) => setA(side(p))} />
        <PackPicker label="Pack B" onLoad={(p) => setB(side(p))} />
      </div>
      {a && b && data && (
        <>
          <dl className={styles.resumen}>
            <div><dt>A · {a.pack.name}</dt><dd>{a.res ? `${a.res}x · ` : ""}{a.pack.versions.length ? versionRange(a.pack.versions) : "versión ?"} · {a.tex.size} texturas</dd></div>
            <div><dt>B · {b.pack.name}</dt><dd>{b.res ? `${b.res}x · ` : ""}{b.pack.versions.length ? versionRange(b.pack.versions) : "versión ?"} · {b.tex.size} texturas</dd></div>
            <div><dt>En los dos</dt><dd className="num">{data.both.length}</dd></div>
            <div><dt>Idénticas</dt><dd className="num">{data.identical}</dd></div>
          </dl>
          <div className={styles.barra}>
            {([["pvp", "Lo de PvP", data.pvp.length], ["ambos", "En los dos", data.both.length], ["soloA", "Solo en A", data.onlyA.length], ["soloB", "Solo en B", data.onlyB.length]] as const).map(([k, l, n]) => (
              <button key={k} type="button" className={styles.filtro} aria-pressed={view === k} onClick={() => setView(k)}>
                {l}
                <span>{n}</span>
              </button>
            ))}
            <select value={cat} onChange={(e) => setCat(e.target.value as Category)} aria-label="Categoría" style={{ marginLeft: "auto" }}>
              <option value="Todas">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {shown.length === 0 ? (
            <p className={styles.nota}>Nada en esta vista.</p>
          ) : (
            <ul className={styles.parejas}>
              {shown.map((k) => {
                const ta = a.tex.get(k);
                const tb = b.tex.get(k);
                const eq = ta && tb && same(a.pack.files.get(ta.path)!, b.pack.files.get(tb.path)!);
                return (
                  <li key={k} className={styles.pareja}>
                    <div>
                      <span className={styles.cuadro}>{ta ? <img src={url(a, ta)} alt={`A: ${k}`} data-anim={ta.animated || undefined} /> : null}</span>
                      <span className={styles.cuadro}>{tb ? <img src={url(b, tb)} alt={`B: ${k}`} data-anim={tb.animated || undefined} /> : null}</span>
                    </div>
                    <small>
                      {k.split("/").pop()}
                      {ta && tb && ta.width !== tb.width ? ` · ${ta.width}x vs ${tb.width}x` : ""}
                      {eq && <span className={styles.igual}> · idéntica</span>}
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
          {keys.length > 300 && <p className={styles.nota}>Mostrando 300 de {keys.length}. Filtra por categoría para ver el resto.</p>}
        </>
      )}
    </>
  );
}
