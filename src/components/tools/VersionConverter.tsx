"use client";

import { strFromU8, strToU8, zipSync } from "fflate";
import { useMemo, useState } from "react";
import { packFields } from "@/lib/pack-format";
import { RESOURCE_PACK_FORMATS } from "@/lib/pack-format-table";
import { BLOCK_RENAMES, BLOCK_RENAMES_BACK, ITEM_RENAMES, ITEM_RENAMES_BACK, type LoadedPack } from "@/lib/pack-reader";
import { versionRange } from "@/lib/versions";
import { PackPicker } from "./PackPicker";
import styles from "./Tools.module.css";

/** Versiones para elegir: la última de cada pack_format (la que la gente usa). */
const TARGETS = (() => {
  const byFormat = new Map<number, string>();
  for (const [v, f] of RESOURCE_PACK_FORMATS) byFormat.set(f, v);
  return [...byFormat.entries()].map(([f, v]) => ({ version: v, format: f })).reverse();
})();

const ARMOR: Record<string, string> = { leather: "leather", chainmail: "chainmail", iron: "iron", gold: "gold", diamond: "diamond", netherite: "netherite", turtle: "turtle_scute" };

type Report = { renamed: number; models: number; notes: string[]; fileName: string; url: string; size: number };

function mcmetaFor(original: Uint8Array | undefined, format: number, label: string) {
  let root: Record<string, unknown> = {};
  try {
    root = original ? JSON.parse(strFromU8(original).replace(/^﻿/, "")) : {};
  } catch {
    root = {};
  }
  const pack = { ...((root.pack as Record<string, unknown>) ?? {}) };
  delete pack.supported_formats;
  delete pack.min_format;
  delete pack.max_format;
  Object.assign(pack, packFields(format));
  const d = typeof pack.description === "string" ? pack.description : "";
  pack.description = d ? `${d} (${label})` : label;
  return strToU8(JSON.stringify({ ...root, pack }, null, 2));
}

/** Cambia carpetas y nombres de texturas entre 1.12 (items/blocks) y 1.13+ (item/block). */
function convert(pack: LoadedPack, target: { version: string; format: number }): Report {
  const srcFormat = pack.meta?.max ?? pack.meta?.packFormat ?? 1;
  const toModern = target.format >= 4;
  const fromModern = srcFormat >= 4;
  const notes: string[] = [];
  const out: Record<string, Uint8Array> = {};
  let renamed = 0;
  let models = 0;
  const renameTexture = (path: string): string => {
    let p = path;
    if (toModern && !fromModern) {
      p = p.replace(/^(assets\/minecraft\/textures\/)(items|blocks)\/([^/]+?)(\.png(?:\.mcmeta)?)$/, (_, a, dir, name, ext) => `${a}${dir === "items" ? "item" : "block"}/${(dir === "items" ? ITEM_RENAMES : BLOCK_RENAMES)[name] ?? name}${ext}`);
    } else if (!toModern && fromModern) {
      p = p.replace(/^(assets\/minecraft\/textures\/)(item|block)\/([^/]+?)(\.png(?:\.mcmeta)?)$/, (_, a, dir, name, ext) => `${a}${dir === "item" ? "items" : "blocks"}/${(dir === "item" ? ITEM_RENAMES_BACK : BLOCK_RENAMES_BACK)[name] ?? name}${ext}`);
    }
    // Armaduras: 1.21.2 las movió a entity/equipment
    if (target.format >= 42 && srcFormat < 42) {
      p = p.replace(/^assets\/minecraft\/textures\/models\/armor\/([a-z]+)_layer_([12])(_overlay)?\.png$/, (m, mat, layer, ov) =>
        ARMOR[mat] ? `assets/minecraft/textures/entity/equipment/${layer === "1" ? "humanoid" : "humanoid_leggings"}/${ARMOR[mat]}${ov ? "_overlay" : ""}.png` : m,
      );
    } else if (target.format < 42 && srcFormat >= 42) {
      const back = Object.fromEntries(Object.entries(ARMOR).map(([a, b]) => [b, a]));
      p = p.replace(/^assets\/minecraft\/textures\/entity\/equipment\/(humanoid|humanoid_leggings)\/([a-z_]+?)(_overlay)?\.png$/, (m, kind, mat, ov) =>
        back[mat] ? `assets/minecraft/textures/models/armor/${back[mat]}_layer_${kind === "humanoid" ? 1 : 2}${ov ? "_overlay" : ""}.png` : m,
      );
    }
    if (p !== path) renamed++;
    return p;
  };
  const rewriteModel = (json: string) =>
    json.replace(/"(minecraft:)?(items|blocks|item|block)\/([a-z0-9_]+)"/g, (m, ns, dir, name) => {
      if (toModern && !fromModern && (dir === "items" || dir === "blocks")) return `"${ns ?? ""}${dir === "items" ? "item" : "block"}/${(dir === "items" ? ITEM_RENAMES : BLOCK_RENAMES)[name] ?? name}"`;
      if (!toModern && fromModern && (dir === "item" || dir === "block")) return `"${ns ?? ""}${dir === "item" ? "items" : "blocks"}/${(dir === "item" ? ITEM_RENAMES_BACK : BLOCK_RENAMES_BACK)[name] ?? name}"`;
      return m;
    });

  for (const name of pack.names) {
    const data = pack.files.get(name);
    if (!data || /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/.test(name)) continue;
    if (name === "pack.mcmeta") continue;
    if (/^assets\/[^/]+\/models\/.+\.json$/.test(name) && toModern !== fromModern) {
      const before = strFromU8(data);
      const after = rewriteModel(before);
      if (after !== before) models++;
      out[name] = strToU8(after);
      continue;
    }
    out[renameTexture(name)] = data;
  }
  out["pack.mcmeta"] = mcmetaFor(pack.files.get("pack.mcmeta"), target.format, `convertido a ${target.version}`);

  if (toModern === fromModern && renamed === 0) notes.push("No hizo falta renombrar texturas: solo se cambió el pack_format.");
  if (toModern && !fromModern) notes.push("Los tintes, la comida y algunos bloques poco usados cambiaron de nombre otra vez en 1.14; esos quedan con el nombre de 1.13.");
  if (target.format >= 18 && srcFormat < 18 && pack.names.some((n) => /textures\/gui\//.test(n)))
    notes.push("La interfaz (carpeta gui) cambió por completo en 1.20.2 y no se convierte: barras, corazones e inventario se verán como en el juego normal.");
  if (target.format < 46 && pack.names.some((n) => /^assets\/minecraft\/items\//.test(n)))
    notes.push("Tiene definiciones de objetos de 1.21.4+ (carpeta items/), que versiones anteriores ignoran.");
  if (pack.names.some((n) => /\/(optifine|mcpatcher)\//.test(n))) notes.push("Las carpetas de OptiFine (CIT, cielos) no se tocan.");

  const zip = zipSync(out, { level: 6 });
  const fileName = `${pack.name} (${target.version}).zip`;
  return { renamed, models, notes, fileName, url: URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" })), size: zip.byteLength };
}

export function VersionConverter() {
  const [pack, setPack] = useState<LoadedPack | null>(null);
  const [target, setTarget] = useState(TARGETS[0].version);
  const [report, setReport] = useState<Report | null>(null);
  const current = useMemo(() => (pack?.versions.length ? versionRange(pack.versions) : null), [pack]);
  const t = TARGETS.find((x) => x.version === target)!;
  return (
    <>
      <PackPicker label="Pack para convertir" onLoad={(p) => { setPack(p); setReport(null); }} />
      {pack && (
        <section style={{ display: "grid", gap: 16 }}>
          {pack.metaError && <p className={styles.aviso}>{pack.metaError} Se va a crear uno nuevo.</p>}
          <dl className={styles.resumen}>
            <div><dt>Ahora es para</dt><dd>{current ?? "versión desconocida"}</dd></div>
            <div><dt>pack_format</dt><dd className="num">{pack.meta?.packFormat ?? "?"}</dd></div>
          </dl>
          <div className={styles.barra}>
            <label htmlFor="destino">Convertir a Minecraft</label>
            <select id="destino" value={target} onChange={(e) => { setTarget(e.target.value); setReport(null); }}>
              {TARGETS.map((x) => (
                <option key={x.version} value={x.version}>
                  {x.version} (pack_format {x.format})
                </option>
              ))}
            </select>
            <button type="button" className="boton boton-principal boton-chico" onClick={() => setReport(convert(pack, t))}>
              Convertir
            </button>
          </div>
          {report && (
            <div style={{ display: "grid", gap: 12 }}>
              <ul className={styles.lista}>
                <li data-t="ok">pack.mcmeta actualizado a pack_format {Math.floor(t.format)}{t.format >= 65 ? " con min_format y max_format" : t.format >= 18 ? " con supported_formats" : ""}.</li>
                {report.renamed > 0 && <li data-t="ok">{report.renamed} texturas movidas o renombradas al formato de {target}.</li>}
                {report.models > 0 && <li data-t="ok">{report.models} modelos actualizados para que apunten a las texturas nuevas.</li>}
                {report.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <a href={report.url} download={report.fileName} className="boton boton-principal" style={{ justifySelf: "start" }}>
                Descargar {report.fileName}
              </a>
              <p className={styles.nota}>Pruébalo en el juego antes de compartirlo. Si el pack es de otra persona, la conversión es solo para tu uso.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
