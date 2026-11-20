"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, pngUrl, type Category, type LoadedPack, type Texture } from "@/lib/pack-reader";
import styles from "./Tools.module.css";

/** Cuadrícula de texturas con filtros por categoría y búsqueda, y vista ampliada. */
export function TextureGrid({ pack, textures }: { pack: LoadedPack; textures: Texture[] }) {
  const [cat, setCat] = useState<Category | "Todas">("Todas");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(240);
  const [open, setOpen] = useState<Texture | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const urls = useMemo(() => new Map<string, string>(), [pack]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const url = (t: Texture) => {
    let u = urls.get(t.path);
    if (!u) urls.set(t.path, (u = pngUrl(pack.files.get(t.path)!)));
    return u;
  };
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    textures.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1));
    return m;
  }, [textures]);
  const shown = textures.filter((t) => (cat === "Todas" || t.category === cat) && (!q || t.path.toLowerCase().includes(q.toLowerCase())));

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className={styles.barra}>
        <button type="button" className={styles.filtro} aria-pressed={cat === "Todas"} onClick={() => setCat("Todas")}>
          Todas<span>{textures.length}</span>
        </button>
        {CATEGORIES.filter((c) => counts.get(c)).map((c) => (
          <button key={c} type="button" className={styles.filtro} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
            <span>{counts.get(c)}</span>
          </button>
        ))}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: sword, apple, fire…" aria-label="Buscar textura" style={{ marginLeft: "auto" }} />
      </div>
      {shown.length === 0 ? (
        <p className={styles.nota}>Ninguna textura coincide.</p>
      ) : (
        <ul className={styles.texturas}>
          {shown.slice(0, limit).map((t) => (
            <li key={t.path}>
              <button type="button" className={styles.textura} onClick={() => setOpen(t)} title={t.path}>
                <span className={styles.cuadro}>
                  <img src={url(t)} alt="" loading="lazy" data-anim={t.animated || undefined} />
                </span>
                <small>{t.name}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown.length > limit && (
        <button type="button" className="boton boton-secundario boton-chico" style={{ justifySelf: "center" }} onClick={() => setLimit((l) => l + 240)}>
          Mostrar más ({shown.length - limit})
        </button>
      )}
      <dialog ref={dialog} className={styles.visor} onClose={() => setOpen(null)} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        {open && (
          <div className={styles.visorCuerpo}>
            <div className={styles.cuadro} style={{ aspectRatio: `${open.width} / ${Math.min(open.height, open.animated ? open.width : open.height)}` }}>
              <img src={url(open)} alt={open.name} data-anim={open.animated || undefined} />
            </div>
            <div className={styles.visorPie}>
              <span>
                <b>{open.name}</b> · {open.width}×{open.height}
                {open.animated ? ` · animada (${Math.round(open.height / open.width)} cuadros)` : ""}
              </span>
              <span style={{ display: "flex", gap: 8 }}>
                <a className="boton boton-secundario boton-chico" href={url(open)} download={`${open.name}.png`}>
                  Descargar PNG
                </a>
                <button type="button" className="boton boton-secundario boton-chico" onClick={() => dialog.current?.close()}>
                  Cerrar
                </button>
              </span>
              <code>{open.path}</code>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
