"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, texturesOf, type LoadedPack } from "@/lib/pack-reader";
import { inspectMod, type ModInspection } from "@/lib/zip-inspect";
import { versionRange } from "@/lib/versions";
import { PackPicker } from "./PackPicker";
import styles from "./Tools.module.css";

const kb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const pow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
const LOADER: Record<string, string> = { fabric: "Fabric", forge: "Forge", neoforge: "NeoForge", quilt: "Quilt" };

type Finding = { t: "ok" | "aviso" | "error"; text: string };

function analyze(pack: LoadedPack) {
  const textures = texturesOf(pack);
  const f: Finding[] = [];
  const fmt = pack.meta?.packFormat ?? pack.meta?.max ?? null;
  if (pack.metaError) f.push({ t: "error", text: pack.metaError });
  else f.push({ t: "ok", text: `pack.mcmeta correcto${fmt != null ? ` (pack_format ${pack.meta!.min !== pack.meta!.max ? `${pack.meta!.min}–${pack.meta!.max}` : fmt})` : ""}.` });
  if (!pack.files.has("pack.png")) f.push({ t: "aviso", text: "No tiene pack.png: en el juego aparece sin ícono." });
  const junk = pack.names.filter((n) => /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)/.test(n));
  if (junk.length) f.push({ t: "aviso", text: `${junk.length} archivos basura del sistema (__MACOSX, .DS_Store, Thumbs.db). Se pueden borrar.` });
  const outside = pack.names.filter((n) => !n.startsWith("assets/") && !/^pack\.(mcmeta|png)$/.test(n) && !/\.(txt|md)$/i.test(n) && !junk.includes(n));
  if (outside.length) f.push({ t: "aviso", text: `${outside.length} archivos fuera de assets/ que el juego ignora: ${outside.slice(0, 3).join(", ")}${outside.length > 3 ? "…" : ""}` });
  // carpeta vieja/nueva según la versión
  const legacyDirs = textures.some((t) => /\/textures\/(items|blocks)\//.test(t.path));
  const modernDirs = textures.some((t) => /\/textures\/(item|block)\//.test(t.path));
  if (fmt != null && fmt >= 4 && legacyDirs) f.push({ t: "error", text: "Usa carpetas textures/items y textures/blocks, pero el pack_format es de 1.13 o más nuevo (ahí se llaman item y block). Esas texturas no se cargan; el conversor lo arregla." });
  if (fmt != null && fmt <= 3 && modernDirs) f.push({ t: "error", text: "Usa carpetas textures/item y textures/block, pero el pack_format es de 1.12 o anterior (ahí se llaman items y blocks)." });
  if (fmt != null && fmt >= 18 && textures.some((t) => t.path.endsWith("textures/gui/icons.png"))) f.push({ t: "aviso", text: "Incluye gui/icons.png, que desde 1.20.2 ya no se usa (la interfaz pasó a gui/sprites/)." });
  const odd = textures.filter((t) => !t.animated && t.category !== "Interfaz" && t.category !== "Entidades" && t.category !== "Armaduras" && t.category !== "Entorno" && (!pow2(t.width) || !pow2(t.height)));
  if (odd.length) f.push({ t: "aviso", text: `${odd.length} texturas con tamaño que no es potencia de 2 (por ejemplo ${odd[0].name}, ${odd[0].width}×${odd[0].height}). Pueden verse borrosas o con mipmaps raros.` });
  const huge = textures.filter((t) => t.bytes > 1024 * 1024);
  if (huge.length) f.push({ t: "aviso", text: `${huge.length} texturas pesan más de 1 MB (${huge.slice(0, 2).map((h) => h.name).join(", ")}). Hacen que el pack cargue lento.` });
  const brokenAnim = textures.filter((t) => t.animated && t.height % t.width !== 0);
  if (brokenAnim.length) f.push({ t: "error", text: `${brokenAnim.length} animaciones con alto que no es múltiplo del ancho (${brokenAnim[0].name}).` });
  const badJson = [...pack.files.entries()].filter(([n]) => /\.(json|mcmeta)$/i.test(n) && n !== "pack.mcmeta").filter(([, b]) => {
    try {
      JSON.parse(new TextDecoder().decode(b));
      return false;
    } catch {
      return true;
    }
  });
  if (badJson.length) f.push({ t: "error", text: `${badJson.length} archivos JSON con errores: ${badJson.slice(0, 3).map(([n]) => n.split("/").pop()).join(", ")}.` });
  const namespaces = [...new Set(pack.names.filter((n) => n.startsWith("assets/")).map((n) => n.split("/")[1]))];
  // resolución de los objetos
  const items = textures.filter((t) => t.category === "Objetos" && !t.animated);
  const widths = new Map<number, number>();
  items.forEach((t) => widths.set(t.width, (widths.get(t.width) ?? 0) + 1));
  const res = [...widths.entries()].sort((a, b) => b[1] - a[1]);
  const byCat = CATEGORIES.map((c) => ({ c, n: textures.filter((t) => t.category === c).length })).filter((x) => x.n);
  const other = {
    models: pack.names.filter((n) => /\/models\/.+\.json$/.test(n)).length,
    sounds: pack.names.filter((n) => /\/sounds\/.+\.ogg$/.test(n)).length,
    shaders: pack.names.filter((n) => /\/shaders\//.test(n)).length,
    fonts: pack.names.filter((n) => /\/font\//.test(n)).length,
    lang: pack.names.filter((n) => /\/lang\//.test(n)).length,
    optifine: pack.names.filter((n) => /\/(optifine|mcpatcher)\//.test(n)).length,
  };
  if (other.optifine) f.push({ t: "aviso", text: `Usa ${other.optifine} archivos de OptiFine (CIT, cielos, CTM). Sin OptiFine o un mod compatible esas partes no se ven.` });
  if (!f.some((x) => x.t !== "ok")) f.push({ t: "ok", text: "No encontramos problemas." });
  return { textures, findings: f, namespaces, res, byCat, other, animated: textures.filter((t) => t.animated).length };
}

export function ZipAnalyzer() {
  const [pack, setPack] = useState<LoadedPack | null>(null);
  const [mod, setMod] = useState<{ name: string; size: number; ins: ModInspection } | null>(null);
  const a = useMemo(() => (pack ? analyze(pack) : null), [pack]);
  return (
    <>
      <PackPicker
        label="Pack o mod para revisar"
        accept=".zip,.jar"
        onLoad={(p, bytes) => {
          const isJar = p.names.some((n) => n === "fabric.mod.json" || n === "META-INF/mods.toml" || n === "META-INF/neoforge.mods.toml" || n === "quilt.mod.json");
          if (isJar) {
            setPack(null);
            setMod({ name: p.name, size: bytes.byteLength, ins: inspectMod(bytes) });
          } else {
            setMod(null);
            setPack(p);
          }
        }}
      />
      {mod && (
        <section style={{ display: "grid", gap: 14 }}>
          <dl className={styles.resumen}>
            <div><dt>Mod</dt><dd>{mod.ins.name ?? mod.name}</dd></div>
            <div><dt>Id</dt><dd>{mod.ins.modId ?? "—"}</dd></div>
            <div><dt>Versión</dt><dd>{mod.ins.version ?? "—"}</dd></div>
            <div><dt>Loaders</dt><dd>{mod.ins.loaders.map((l) => LOADER[l]).join(", ") || "—"}</dd></div>
            <div><dt>Minecraft</dt><dd>{mod.ins.mcRange ?? "no lo indica"}</dd></div>
            <div><dt>Tamaño</dt><dd>{kb(mod.size)}</dd></div>
          </dl>
          <h2 className={styles.h2}>Dependencias</h2>
          {mod.ins.dependencies.length ? (
            <ul className={styles.lista}>
              {mod.ins.dependencies.map((d) => (
                <li key={d.id} data-t={d.kind === "incompatible" ? "error" : d.kind === "required" ? undefined : "ok"}>
                  {d.id} — {d.kind === "required" ? "necesaria" : d.kind === "optional" ? "opcional" : "incompatible"}
                  {d.range && d.range !== "*" ? ` (${d.range})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.nota}>No declara dependencias además del loader.</p>
          )}
          {[...mod.ins.errors, ...mod.ins.warnings].map((e) => (
            <p key={e} className={styles.aviso}>{e}</p>
          ))}
        </section>
      )}
      {pack && a && (
        <section style={{ display: "grid", gap: 18 }}>
          <dl className={styles.resumen}>
            <div><dt>pack_format</dt><dd className="num">{pack.meta?.min !== pack.meta?.max ? `${pack.meta?.min}–${pack.meta?.max}` : pack.meta?.packFormat ?? "?"}</dd></div>
            <div><dt>Minecraft</dt><dd>{pack.versions.length ? versionRange(pack.versions) : "—"}</dd></div>
            <div><dt>Texturas</dt><dd className="num">{a.textures.length}</dd></div>
            <div><dt>Resolución</dt><dd className="num">{a.res[0] ? `${a.res[0][0]}x` : "—"}</dd></div>
            <div><dt>Archivos</dt><dd className="num">{pack.names.length}</dd></div>
            <div><dt>Tamaño</dt><dd>{kb(pack.size)}</dd></div>
          </dl>
          {pack.meta?.description && <p className={styles.nota}>Descripción: {pack.meta.description}</p>}
          <h2 className={styles.h2}>Revisión</h2>
          <ul className={styles.lista}>
            {a.findings.map((x) => (
              <li key={x.text} data-t={x.t === "aviso" ? undefined : x.t}>
                {x.text}
              </li>
            ))}
          </ul>
          <div className={styles.dos}>
            <div>
              <h2 className={styles.h2}>Qué cambia</h2>
              <table className={styles.tabla}>
                <tbody>
                  {a.byCat.map((x) => (
                    <tr key={x.c}><td>{x.c}</td><td className="num">{x.n}</td></tr>
                  ))}
                  {a.animated > 0 && <tr><td>Texturas animadas</td><td>{a.animated}</td></tr>}
                  {a.other.models > 0 && <tr><td>Modelos (.json)</td><td>{a.other.models}</td></tr>}
                  {a.other.sounds > 0 && <tr><td>Sonidos</td><td>{a.other.sounds}</td></tr>}
                  {a.other.fonts > 0 && <tr><td>Fuentes</td><td>{a.other.fonts}</td></tr>}
                  {a.other.shaders > 0 && <tr><td>Shaders</td><td>{a.other.shaders}</td></tr>}
                  {a.other.lang > 0 && <tr><td>Traducciones</td><td>{a.other.lang}</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <h2 className={styles.h2}>Tamaños de los objetos</h2>
              <table className={styles.tabla}>
                <tbody>
                  {a.res.slice(0, 6).map(([w, n]) => (
                    <tr key={w}><td>{w}×{w}</td><td>{n} texturas</td></tr>
                  ))}
                  {!a.res.length && <tr><td>Sin texturas de objetos</td><td /></tr>}
                </tbody>
              </table>
              {a.namespaces.length > 1 && <p className={styles.nota}>Carpetas de assets: {a.namespaces.join(", ")} (las que no son “minecraft” son de mods).</p>}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
