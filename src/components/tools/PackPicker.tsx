"use client";

import { useEffect, useId, useState } from "react";
import { readPack, type LoadedPack } from "@/lib/pack-reader";
import styles from "./Tools.module.css";

type CatalogPack = { slug: string; name: string; type: string; authorName: string; resolution: number | null; mcVersions: string[]; isSample: boolean };

let catalogCache: Promise<CatalogPack[]> | null = null;
const loadCatalog = () =>
  (catalogCache ??= fetch("/api/herramientas/packs")
    .then((r) => r.json())
    .then((j) => j.packs as CatalogPack[])
    .catch(() => {
      catalogCache = null;
      return [];
    }));

const kb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Abre un pack: uno publicado en Fancy Packs o un .zip de la computadora. Todo se procesa en el navegador. */
export function PackPicker({ label, onLoad, accept = ".zip", allowCatalog = true }: { label: string; onLoad: (p: LoadedPack, bytes: Uint8Array) => void; accept?: string; allowCatalog?: boolean }) {
  const id = useId();
  const [mode, setMode] = useState<"catalogo" | "archivo">(allowCatalog ? "catalogo" : "archivo");
  const [catalog, setCatalog] = useState<CatalogPack[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<{ name: string; size: number } | null>(null);

  useEffect(() => {
    if (mode === "catalogo" && !catalog) loadCatalog().then(setCatalog);
  }, [mode, catalog]);

  async function open(bytes: Uint8Array, name: string) {
    try {
      setBusy("Leyendo el pack…");
      await new Promise((r) => setTimeout(r, 0));
      const pack = readPack(bytes, name);
      setLoaded({ name, size: bytes.byteLength });
      onLoad(pack, bytes);
    } catch {
      setError("No se pudo abrir: el archivo no es un .zip válido.");
    } finally {
      setBusy("");
    }
  }

  async function fromCatalog(p: CatalogPack) {
    setError("");
    setBusy(`Descargando ${p.name}…`);
    try {
      const r = await fetch(`/api/archivo/${encodeURIComponent(p.slug)}`);
      if (!r.ok) throw new Error();
      await open(new Uint8Array(await r.arrayBuffer()), p.name);
    } catch {
      setBusy("");
      setError("No se pudo descargar ese pack. Intenta con otro.");
    }
  }

  async function fromFile(f: File) {
    setError("");
    if (f.size > 100 * 1024 * 1024) return setError("El archivo pesa más de 100 MB.");
    await open(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.(zip|jar)$/i, ""));
  }

  if (loaded && !busy)
    return (
      <div className={styles.cargado}>
        <span>
          <b>{loaded.name}</b> <small>{kb(loaded.size)}</small>
        </span>
        <button type="button" className="boton boton-secundario boton-chico" onClick={() => setLoaded(null)}>
          Cambiar
        </button>
      </div>
    );

  const list = (catalog ?? []).filter((p) => !q || `${p.name} ${p.authorName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  return (
    <div className={styles.picker}>
      <p className={styles.pickerTitulo}>{label}</p>
      {allowCatalog && (
        <div className={styles.modo} role="tablist" aria-label="De dónde abrir el pack">
          <button type="button" role="tab" aria-selected={mode === "catalogo"} onClick={() => setMode("catalogo")}>
            De Fancy Packs
          </button>
          <button type="button" role="tab" aria-selected={mode === "archivo"} onClick={() => setMode("archivo")}>
            De mi computadora
          </button>
        </div>
      )}
      {busy ? (
        <p className={styles.cargando} role="status">
          {busy}
        </p>
      ) : mode === "archivo" ? (
        <label className={styles.soltar} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) fromFile(f); }}>
          <input type="file" accept={accept} className="solo-lectores" onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])} />
          <b>Arrastra el {accept.replace(",", " o ")} o haz clic para elegirlo</b>
          <small>Se abre en tu navegador; no se sube a ningún lado.</small>
        </label>
      ) : (
        <div className={styles.catalogo}>
          <label htmlFor={`${id}-q`} className="solo-lectores">
            Buscar pack
          </label>
          <input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o creador" />
          {catalog === null ? (
            <p className={styles.cargando}>Cargando packs…</p>
          ) : list.length ? (
            <ul>
              {list.map((p) => (
                <li key={p.slug}>
                  <button type="button" onClick={() => fromCatalog(p)}>
                    <b>{p.name}</b>
                    <small>
                      {p.authorName}
                      {p.resolution ? ` · ${p.resolution}x` : ""}
                      {p.type === "overlay" ? " · overlay" : ""}
                      {p.isSample ? " · ejemplo" : ""}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.cargando}>Ningún pack coincide.</p>
          )}
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
