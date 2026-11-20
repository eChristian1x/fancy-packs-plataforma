/**
 * Revisión de archivos subidos (servidor y navegador): resource packs (.zip) y mods (.jar).
 * Reemplaza la validación que hacía scripts/build.py en el sitio anterior.
 */
import { unzipSync, strFromU8, type Unzipped } from "fflate";
import { parsePackMcmeta, versionsFromMeta, type PackMeta } from "./pack-format";

export type Inspection = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type PackInspection = Inspection & {
  meta: PackMeta | null;
  versions: string[];
  textures: number;
  hasIcon: boolean;
  /** Resolución detectada por el tamaño de las texturas de objetos (16, 32, 64…). */
  resolution: number | null;
  files: string[];
};

export type ModInspection = Inspection & {
  loaders: ("fabric" | "forge" | "neoforge" | "quilt")[];
  modId: string | null;
  name: string | null;
  version: string | null;
  mcRange: string | null;
  dependencies: { id: string; kind: "required" | "optional" | "incompatible"; range?: string }[];
};

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // límite de Supabase Storage (plan gratuito)

/** Resoluciones que se pueden elegir al publicar (la detectada se redondea a una de estas). */
export const RESOLUTIONS = [8, 16, 32, 64, 128, 256, 512] as const;
export const nearestResolution = (w: number) => RESOLUTIONS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));

/** Lee el .zip. Solo descomprime lo que pida `want`; los nombres de todo quedan en `names`. */
export function readZip(data: Uint8Array, want: (name: string) => boolean = () => true): { files: Unzipped; names: string[] } {
  const names: string[] = [];
  const files = unzipSync(data, {
    filter: (f) => {
      if (f.name.endsWith("/")) return false;
      names.push(f.name);
      return want(f.name) && f.originalSize < 8 * 1024 * 1024;
    },
  });
  return { files, names };
}

const ITEM_TEX = /^assets\/minecraft\/textures\/items?\/[^/]+\.png$/i;
const META_FILES = new Set(["pack.mcmeta", "pack.png", "fabric.mod.json", "quilt.mod.json", "META-INF/mods.toml", "META-INF/neoforge.mods.toml"]);

const isPng = (b: Uint8Array) => b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const pngWidth = (b: Uint8Array) => (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];

export function inspectResourcePack(data: Uint8Array): PackInspection {
  const res: PackInspection = { ok: false, errors: [], warnings: [], meta: null, versions: [], textures: 0, hasIcon: false, resolution: null, files: [] };
  let z: Unzipped;
  let names: string[];
  try {
    let items = 0;
    ({ files: z, names } = readZip(data, (n) => META_FILES.has(n) || (ITEM_TEX.test(n) && items++ < 60)));
  } catch {
    res.errors.push("El archivo no es un .zip válido o está dañado.");
    return res;
  }
  res.files = names;
  if (names.some((n) => n === "manifest.json") && !names.includes("pack.mcmeta")) {
    res.errors.push("Es un pack de Bedrock (.mcpack). Por ahora solo se aceptan packs de Java.");
    return res;
  }
  if (!names.includes("pack.mcmeta")) {
    const nested = names.find((n) => /^[^/]+\/pack\.mcmeta$/.test(n));
    res.errors.push(
      nested
        ? `pack.mcmeta está dentro de la carpeta "${nested.split("/")[0]}". Comprime el contenido de la carpeta, no la carpeta.`
        : "Falta pack.mcmeta en la raíz del .zip.",
    );
    return res;
  }
  try {
    res.meta = parsePackMcmeta(strFromU8(z["pack.mcmeta"]));
  } catch {
    res.errors.push("pack.mcmeta no es JSON válido.");
    return res;
  }
  if (res.meta.packFormat == null && res.meta.min == null) res.errors.push("pack.mcmeta no dice para qué versión es (pack_format).");
  res.versions = versionsFromMeta(res.meta);
  res.hasIcon = names.includes("pack.png");
  if (!res.hasIcon) res.warnings.push("No tiene pack.png: en el juego se verá sin ícono.");
  const textures = names.filter((n) => /^assets\/[^/]+\/textures\/.+\.png$/i.test(n));
  res.textures = textures.length;
  if (!textures.length && !names.some((n) => n.startsWith("assets/"))) res.warnings.push("No contiene ninguna carpeta assets/: el pack no cambia nada.");
  const widths = Object.keys(z)
    .filter((n) => ITEM_TEX.test(n))
    .map((n) => (isPng(z[n]) ? pngWidth(z[n]) : 0))
    .filter((w) => w > 0 && w <= 4096);
  if (widths.length) {
    const counts = new Map<number, number>();
    widths.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
    res.resolution = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const junk = names.filter((n) => /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)/.test(n));
  if (junk.length) res.warnings.push(`Incluye ${junk.length} archivo(s) basura del sistema (__MACOSX, .DS_Store…).`);
  res.ok = !res.errors.length;
  return res;
}

/** Lector mínimo de valores "clave = valor" de mods.toml. */
function tomlValue(src: string, key: string) {
  const m = src.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']*)["']`, "m"));
  return m?.[1] ?? null;
}

export function inspectMod(data: Uint8Array): ModInspection {
  const res: ModInspection = { ok: false, errors: [], warnings: [], loaders: [], modId: null, name: null, version: null, mcRange: null, dependencies: [] };
  let z: Unzipped;
  try {
    ({ files: z } = readZip(data, (n) => META_FILES.has(n)));
  } catch {
    res.errors.push("El archivo no es un .jar válido o está dañado.");
    return res;
  }
  const read = (p: string) => (z[p] ? strFromU8(z[p]) : null);
  const fabric = read("fabric.mod.json");
  const quilt = read("quilt.mod.json");
  const forge = read("META-INF/mods.toml");
  const neo = read("META-INF/neoforge.mods.toml");
  try {
    if (fabric) {
      const j = JSON.parse(fabric);
      res.loaders.push("fabric");
      res.modId = j.id ?? null;
      res.name = j.name ?? null;
      res.version = j.version ?? null;
      const dep = (o: Record<string, unknown> | undefined, kind: "required" | "optional" | "incompatible") =>
        Object.entries(o ?? {}).forEach(([id, range]) => {
          if (id === "minecraft") res.mcRange = Array.isArray(range) ? range.join(" ") : String(range);
          else if (!["fabricloader", "java"].includes(id)) res.dependencies.push({ id, kind, range: Array.isArray(range) ? range.join(" ") : String(range) });
        });
      dep(j.depends, "required");
      dep(j.recommends ?? j.suggests, "optional");
      dep(j.breaks ?? j.conflicts, "incompatible");
    }
    if (quilt) {
      const j = JSON.parse(quilt);
      res.loaders.push("quilt");
      res.modId ??= j.quilt_loader?.id ?? null;
      res.version ??= j.quilt_loader?.version ?? null;
      res.name ??= j.quilt_loader?.metadata?.name ?? null;
    }
  } catch {
    res.errors.push("fabric.mod.json o quilt.mod.json no es JSON válido.");
  }
  for (const [src, loader] of [[neo, "neoforge"], [forge, forge?.includes("neoforge") ? "neoforge" : "forge"]] as const) {
    if (!src) continue;
    if (!res.loaders.includes(loader)) res.loaders.push(loader);
    res.modId ??= tomlValue(src, "modId");
    res.name ??= tomlValue(src, "displayName");
    const v = tomlValue(src, "version");
    if (v && !v.includes("${")) res.version ??= v;
    // [[dependencies.<id>]] modId="minecraft" … versionRange="[1.20.1,1.21)"
    for (const block of src.split(/\[\[dependencies\.[^\]]+\]\]/).slice(1)) {
      const id = tomlValue(block, "modId");
      const range = tomlValue(block, "versionRange") ?? undefined;
      const type = (tomlValue(block, "type") ?? (/mandatory\s*=\s*true/.test(block) ? "required" : "optional")).toLowerCase();
      if (!id) continue;
      if (id === "minecraft") res.mcRange ??= range ?? null;
      else if (!["forge", "neoforge", "java"].includes(id) && !res.dependencies.some((d) => d.id === id))
        res.dependencies.push({ id, kind: type === "incompatible" || type === "discouraged" ? "incompatible" : type === "required" ? "required" : "optional", range });
    }
  }
  if (!res.loaders.length) res.errors.push("No es un mod: no encontré fabric.mod.json, quilt.mod.json ni META-INF/mods.toml.");
  res.ok = !res.errors.length;
  return res;
}
