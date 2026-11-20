"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { featuresFromImageSource } from "@/lib/image-features";
import { resourceHref } from "@/lib/routes";
import styles from "./Tools.module.css";

type Match = { slug: string; type: "texture" | "overlay" | "mod"; name: string; authorName: string; resolution: number | null; coverUrl: string | null; matchedUrl: string; score: number; isSample: boolean };

/**
 * Buscar por captura. La imagen no sale del navegador: se reduce a una huella de 112 números
 * (colores y composición) y solo eso se manda al servidor, que la compara con las imágenes
 * de todos los packs publicados.
 */
export function ImageSearch() {
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const urlRef = useRef<string | null>(null);

  async function search(file: Blob) {
    setError("");
    if (!file.type.startsWith("image/")) return setError("Eso no es una imagen. Usa PNG, JPG o WebP.");
    if (file.size > 25 * 1024 * 1024) return setError("La imagen pesa más de 25 MB.");
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setPreview(urlRef.current);
    setBusy(true);
    setResults(null);
    try {
      const vector = await featuresFromImageSource(file);
      const r = await fetch("/api/buscar-imagen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vector }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResults(j.results);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se pudo buscar. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  // Pegar una captura con Ctrl+V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (f) search(f);
    };
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  });

  return (
    <div className={styles.busqueda}>
      <div className={styles.captura}>
        <label
          className={styles.soltar}
          style={over ? { borderColor: "var(--fresa)", background: "var(--fresa-tinte)" } : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) search(f);
          }}
        >
          <input type="file" accept="image/png,image/jpeg,image/webp" className="solo-lectores" onChange={(e) => e.target.files?.[0] && search(e.target.files[0])} />
          <b>{preview ? "Probar con otra captura" : "Arrastra una captura, haz clic o pégala con Ctrl+V"}</b>
          <small>La imagen no se sube: se compara en tu navegador.</small>
        </label>
        {preview && <img src={preview} alt="Tu captura" />}
        <p className={styles.nota}>
          Compara colores y composición con las capturas y portadas de cada pack. Funciona mejor con capturas del juego que muestren la mano, el inventario o la barra rápida.
        </p>
      </div>

      <div aria-live="polite">
        {busy && <p className={styles.cargando}>Buscando packs parecidos…</p>}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {results && !busy && (
          <>
            <h2 className={styles.h2}>{results.length ? "Los que más se parecen" : "No hay packs con imágenes para comparar todavía."}</h2>
            {results.length > 0 && (
              <ol className={styles.resultados} style={{ marginTop: 12 }}>
                {results.map((m) => {
                  // Similitud de coseno de las huellas centradas: 1 = igual, 0 = nada en común.
                  const pct = Math.max(0, Math.min(100, Math.round(m.score * 100)));
                  return (
                    <li key={m.slug} className={styles.resultado}>
                      <img src={m.matchedUrl} alt="" loading="lazy" />
                      <Link href={resourceHref(m.type, m.slug)}>{m.name}</Link>
                      <small>
                        de {m.authorName}
                        {m.resolution ? ` · ${m.resolution}x` : ""}
                        {m.isSample ? " · ejemplo" : ""}
                      </small>
                      <span className={styles.parecido} title="Similitud de colores y composición">
                        <span>
                          <i style={{ width: `${pct}%` }} />
                        </span>
                        {pct}%
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
        {!results && !busy && !error && <p className={styles.nota}>Los resultados aparecen aquí.</p>}
      </div>
    </div>
  );
}
