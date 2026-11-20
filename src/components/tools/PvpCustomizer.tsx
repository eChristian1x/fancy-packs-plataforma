"use client";

import { strToU8, zipSync } from "fflate";
import { useEffect, useMemo, useState } from "react";
import { packFields } from "@/lib/pack-format";
import { RESOURCE_PACK_FORMATS } from "@/lib/pack-format-table";
import { filesForSlot, legacyKey, modernKey, PVP_SLOTS, pngUrl, type LoadedPack } from "@/lib/pack-reader";
import { PackPicker } from "./PackPicker";
import styles from "./Tools.module.css";

type Source = { id: number; pack: LoadedPack };
const LETTERS = "ABCDEFGH";

/** Ícono 64×64 del pack generado: la letra F en pixel sobre fondo rosa. */
function makeIcon(): Uint8Array | null {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#15101a";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#ff6fb1";
  g.fillRect(4, 4, 56, 56);
  g.fillStyle = "#fff6fa";
  [[20, 16, 24, 6], [20, 16, 6, 32], [20, 28, 18, 6]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  const data = c.toDataURL("image/png").split(",")[1];
  return Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
}

/**
 * Arma un pack propio tomando cada grupo de texturas (espadas, manzanas, tótem…) de un pack distinto.
 * Todo pasa en el navegador. El resultado incluye un LEEME con el crédito de cada parte.
 */
export function PvpCustomizer() {
  const [sources, setSources] = useState<Source[]>([]);
  const [choice, setChoice] = useState<Record<string, number | "">>({});
  const [base, setBase] = useState<number | "">("");
  const [noBlur, setNoBlur] = useState(false);
  const [version, setVersion] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; files: number } | null>(null);
  const [name, setName] = useState("Mi pack PvP");

  const add = (pack: LoadedPack) => {
    setSources((s) => {
      if (s.length >= LETTERS.length) return s;
      const id = (s.at(-1)?.id ?? -1) + 1;
      const next = [...s, { id, pack }];
      if (s.length === 0) setBase(id);
      return next;
    });
    setResult(null);
  };

  // Qué grupos tiene cada pack
  const available = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const slot of PVP_SLOTS) m.set(slot.key, sources.filter((s) => filesForSlot(s.pack, slot).some((f) => f.endsWith(".png"))).map((s) => s.id));
    return m;
  }, [sources]);

  // Por omisión, cada grupo sale del primer pack que lo tenga
  useEffect(() => {
    setChoice((c) => {
      const n = { ...c };
      for (const slot of PVP_SLOTS) if (n[slot.key] === undefined || (n[slot.key] !== "" && !available.get(slot.key)?.includes(n[slot.key] as number))) n[slot.key] = available.get(slot.key)?.[0] ?? "";
      return n;
    });
  }, [available]);

  const versions = useMemo(() => {
    const byFormat = new Map<number, string>();
    for (const [v, f] of RESOURCE_PACK_FORMATS) byFormat.set(f, v);
    return [...byFormat.entries()].map(([f, v]) => ({ v, f })).reverse();
  }, []);
  const baseSrc = sources.find((s) => s.id === base);
  const targetVersion = version || baseSrc?.pack.versions.at(-1) || versions[0].v;

  const thumbs = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const slot of PVP_SLOTS) {
      const id = choice[slot.key];
      const src = sources.find((s) => s.id === id);
      if (!src) continue;
      m.set(slot.key, filesForSlot(src.pack, slot).filter((f) => f.endsWith(".png")).slice(0, 4).map((f) => pngUrl(src.pack.files.get(f)!)));
    }
    return m;
  }, [choice, sources]);
  useEffect(() => () => thumbs.forEach((l) => l.forEach((u) => URL.revokeObjectURL(u))), [thumbs]);

  function build() {
    const out: Record<string, Uint8Array> = {};
    const credits: string[] = [];
    // 1. Pack base completo (todo lo que no se elige por grupo)
    if (baseSrc) {
      for (const [path, data] of baseSrc.pack.files) {
        if (path === "pack.mcmeta" || path === "pack.png" || /(^|\/)(__MACOSX|\.DS_Store)/.test(path)) continue;
        out[path] = data;
      }
      credits.push(`Base: ${baseSrc.pack.name}`);
    }
    // 2. Cada grupo desde su pack. Se pasa a los nombres de 1.13+ si la versión elegida lo usa.
    const modern = (RESOURCE_PACK_FORMATS.find(([v]) => v === targetVersion)?.[1] ?? 99) >= 4;
    for (const slot of PVP_SLOTS) {
      const id = choice[slot.key];
      const src = sources.find((s) => s.id === id);
      if (!src) continue;
      // Quitar lo que traía la base para este grupo (para no mezclar versiones viejas y nuevas)
      for (const p of Object.keys(out)) {
        const m = p.match(/^assets\/minecraft\/textures\/(.+\.png)(\.mcmeta)?$/);
        if (m && slot.match(modernKey(`assets/minecraft/textures/${m[1]}`))) delete out[p];
      }
      for (const f of filesForSlot(src.pack, slot)) {
        const m = f.match(/^assets\/minecraft\/textures\/(.+?)\.png(\.mcmeta)?$/)!;
        out[`assets/minecraft/textures/${modern ? modernKey(`assets/minecraft/textures/${m[1]}.png`) : legacyKey(m[1])}.png${m[2] ?? ""}`] = src.pack.files.get(f)!;
      }
      credits.push(`${slot.label}: ${src.pack.name}`);
    }
    if (noBlur) {
      // PNG transparente de 1×1: quita el borroso de la calabaza
      out["assets/minecraft/textures/misc/pumpkinblur.png"] = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
      credits.push("Sin borroso de calabaza");
    }
    const fmt = RESOURCE_PACK_FORMATS.find(([v]) => v === targetVersion)?.[1] ?? 1;
    const pack = { ...packFields(fmt), description: `${name} · hecho en Fancy Packs` };
    out["pack.mcmeta"] = strToU8(JSON.stringify({ pack }, null, 2));
    const icon = makeIcon();
    if (icon) out["pack.png"] = icon;
    out["LEEME.txt"] = strToU8(
      `${name}\nHecho con el personalizador de Fancy Packs para Minecraft ${targetVersion}.\n\nDe dónde sale cada parte:\n${credits.map((c) => `- ${c}`).join("\n")}\n\nLas texturas son de sus autores. Este pack es para tu uso personal: no lo publiques como tuyo.\n`,
    );
    const zip = zipSync(out, { level: 6 });
    if (result) URL.revokeObjectURL(result.url);
    setResult({ url: URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" })), name: `${name.replace(/[^\w áéíóúñ.-]/gi, "").trim() || "pack"}.zip`, files: Object.keys(out).length });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section style={{ display: "grid", gap: 10 }}>
        <h2 className={styles.h2}>1. Elige los packs que quieres mezclar</h2>
        {sources.length > 0 && (
          <ul className={styles.fuentes}>
            {sources.map((s) => (
              <li key={s.id} className={styles.fuente}>
                <b>{LETTERS[s.id % LETTERS.length]}</b>
                {s.pack.name}
                <button type="button" aria-label={`Quitar ${s.pack.name}`} onClick={() => { setSources((x) => x.filter((y) => y.id !== s.id)); if (base === s.id) setBase(""); setResult(null); }}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {sources.length < LETTERS.length && <PackPicker key={sources.length} label={sources.length ? "Agregar otro pack" : "Primer pack"} onLoad={(p) => add(p)} />}
      </section>

      {sources.length > 0 && (
        <>
          <section style={{ display: "grid", gap: 10 }}>
            <h2 className={styles.h2}>2. De qué pack sale cada cosa</h2>
            <div className={styles.ranura}>
              <b>Todo lo demás</b>
              <select value={base} onChange={(e) => { setBase(e.target.value === "" ? "" : Number(e.target.value)); setResult(null); }} aria-label="Pack base">
                <option value="">Texturas normales del juego</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{LETTERS[s.id % LETTERS.length]} · {s.pack.name}</option>
                ))}
              </select>
              <span className={styles.nota}>bloques, interfaz, sonidos…</span>
            </div>
            <div className={styles.ranuras}>
              {PVP_SLOTS.map((slot) => {
                const opts = available.get(slot.key) ?? [];
                return (
                  <div key={slot.key} className={styles.ranura}>
                    <b>{slot.label}</b>
                    <select
                      value={choice[slot.key] ?? ""}
                      onChange={(e) => { setChoice((c) => ({ ...c, [slot.key]: e.target.value === "" ? "" : Number(e.target.value) })); setResult(null); }}
                      aria-label={slot.label}
                      disabled={!opts.length}
                    >
                      <option value="">{opts.length ? "Del pack base" : "Ningún pack lo cambia"}</option>
                      {sources.filter((s) => opts.includes(s.id)).map((s) => (
                        <option key={s.id} value={s.id}>{LETTERS[s.id % LETTERS.length]} · {s.pack.name}</option>
                      ))}
                    </select>
                    <span className="mini">
                      {(thumbs.get(slot.key) ?? []).map((u) => (
                        <img key={u} src={u} alt="" />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <h2 className={styles.h2}>3. Ajustes</h2>
            <div className={styles.barra}>
              <label htmlFor="nombre-pack">Nombre</label>
              <input id="nombre-pack" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} />
              <label htmlFor="version-pack">Minecraft</label>
              <select id="version-pack" value={targetVersion} onChange={(e) => setVersion(e.target.value)}>
                {versions.map((x) => (
                  <option key={x.v} value={x.v}>{x.v}</option>
                ))}
              </select>
              <label className={styles.filtro} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={noBlur} onChange={(e) => setNoBlur(e.target.checked)} /> Quitar el borroso de la calabaza
              </label>
            </div>
            <p className={styles.nota}>Las texturas de packs viejos se renombran al formato de la versión elegida cuando hace falta (por ejemplo apple_golden → golden_apple).</p>
          </section>

          <div className={styles.barra}>
            <button type="button" className="boton boton-principal" onClick={build}>
              Armar mi pack
            </button>
            {result && (
              <a href={result.url} download={result.name} className="boton boton-secundario">
                Descargar {result.name} ({result.files} archivos)
              </a>
            )}
          </div>
          <p className={styles.nota}>Las texturas siguen siendo de sus autores: el pack que armes es para tu uso personal, no para publicarlo.</p>
        </>
      )}
    </div>
  );
}
