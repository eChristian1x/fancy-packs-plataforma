/**
 * Lectura de resource packs en el navegador para las herramientas (visor, comparador,
 * analizador, conversor y personalizador). No toca el servidor.
 */
import { strFromU8, unzipSync } from "fflate";
import { parsePackMcmeta, versionsFromMeta, type PackMeta } from "./pack-format";

export type LoadedPack = {
  name: string;
  size: number;
  /** Todos los archivos del .zip (ruta → bytes). Solo se descomprime lo que pesa menos de 16 MB. */
  files: Map<string, Uint8Array>;
  names: string[];
  meta: PackMeta | null;
  metaError: string | null;
  versions: string[];
};

const MAX_TOTAL = 400 * 1024 * 1024;

export function readPack(bytes: Uint8Array, name: string): LoadedPack {
  let total = 0;
  const names: string[] = [];
  const raw = unzipSync(bytes, {
    filter: (f) => {
      if (f.name.endsWith("/")) return false;
      names.push(f.name);
      total += f.originalSize;
      return f.originalSize < 16 * 1024 * 1024 && total < MAX_TOTAL;
    },
  });
  const files = new Map(Object.entries(raw));
  let meta: PackMeta | null = null;
  let metaError: string | null = null;
  const mc = files.get("pack.mcmeta");
  if (mc) {
    try {
      meta = parsePackMcmeta(strFromU8(mc));
    } catch {
      metaError = "pack.mcmeta no es JSON válido.";
    }
  } else metaError = names.some((n) => /^[^/]+\/pack\.mcmeta$/.test(n)) ? "pack.mcmeta está dentro de una carpeta: el pack está comprimido con su carpeta." : "Falta pack.mcmeta.";
  return { name, size: bytes.byteLength, files, names, meta, metaError, versions: meta ? versionsFromMeta(meta) : [] };
}

export const isPng = (b: Uint8Array) => b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
export function pngSize(b: Uint8Array) {
  if (!isPng(b)) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

export type Texture = { path: string; key: string; name: string; category: Category; width: number; height: number; animated: boolean; bytes: number };

export const CATEGORIES = ["Objetos", "Bloques", "Armaduras", "Entidades", "Interfaz", "Partículas", "Entorno", "Efectos", "Otros"] as const;
export type Category = (typeof CATEGORIES)[number];

export function categoryOf(path: string): Category {
  const p = path.replace(/^assets\/[^/]+\/textures\//, "");
  if (/^items?\//.test(p)) return "Objetos";
  if (/^blocks?\//.test(p)) return "Bloques";
  if (/^models\/armor\/|^entity\/equipment\//.test(p)) return "Armaduras";
  if (/^entity\//.test(p)) return "Entidades";
  if (/^gui\//.test(p) || /^font\//.test(p)) return "Interfaz";
  if (/^particle\//.test(p)) return "Partículas";
  if (/^environment\//.test(p) || /^misc\//.test(p)) return "Entorno";
  if (/^mob_effect\//.test(p) || /^effect\//.test(p)) return "Efectos";
  return "Otros";
}

/** Texturas del pack con su tamaño, categoría y clave normalizada (sirve para comparar versiones distintas). */
export function texturesOf(pack: LoadedPack): Texture[] {
  const out: Texture[] = [];
  for (const [path, b] of pack.files) {
    if (!/^assets\/[^/]+\/textures\/.+\.png$/i.test(path)) continue;
    const size = pngSize(b);
    if (!size) continue;
    out.push({
      path,
      key: modernKey(path),
      name: path.split("/").pop()!.replace(/\.png$/i, ""),
      category: categoryOf(path),
      width: size.width,
      height: size.height,
      animated: pack.files.has(path + ".mcmeta"),
      bytes: b.byteLength,
    });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// ------------------------------------------------------------------ nombres entre versiones (1.12 ↔ 1.13+)

const COLORS = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "silver", "cyan", "purple", "blue", "brown", "green", "red", "black"];
const color = (c: string) => (c === "silver" ? "light_gray" : c);
const WOODS: [string, string][] = [["oak", "oak"], ["spruce", "spruce"], ["birch", "birch"], ["jungle", "jungle"], ["acacia", "acacia"], ["big_oak", "dark_oak"]];

/** Texturas renombradas en 1.13 ("the flattening"): nombre viejo → nombre nuevo, sin carpeta. */
export const ITEM_RENAMES: Record<string, string> = {
  apple_golden: "golden_apple",
  bow_standby: "bow",
  book_normal: "book",
  book_enchanted: "enchanted_book",
  bucket_empty: "bucket",
  bucket_water: "water_bucket",
  bucket_lava: "lava_bucket",
  bucket_milk: "milk_bucket",
  carrot_golden: "golden_carrot",
  fishing_rod_uncast: "fishing_rod",
  fireworks: "firework_rocket",
  fireworks_charge: "firework_star",
  potion_bottle_drinkable: "potion",
  potion_bottle_splash: "splash_potion",
  potion_bottle_lingering: "lingering_potion",
  potion_bottle_empty: "glass_bottle",
  totem: "totem_of_undying",
  steak: "cooked_beef",
  porkchop_raw: "porkchop",
  porkchop_cooked: "cooked_porkchop",
  chicken_raw: "chicken",
  chicken_cooked: "cooked_chicken",
  potato_baked: "baked_potato",
  melon_speckled: "glistering_melon_slice",
  ...Object.fromEntries(["sword", "axe", "hoe", "pickaxe", "shovel", "helmet", "chestplate", "leggings", "boots", "horse_armor"].map((t) => [`gold_${t}`, `golden_${t}`])),
  ...Object.fromEntries(["sword", "axe", "hoe", "pickaxe", "shovel"].map((t) => [`wood_${t}`, `wooden_${t}`])),
};

export const BLOCK_RENAMES: Record<string, string> = {
  fire_layer_0: "fire_0",
  fire_layer_1: "fire_1",
  stonebrick: "stone_bricks",
  stonebrick_mossy: "mossy_stone_bricks",
  stonebrick_cracked: "cracked_stone_bricks",
  grass_top: "grass_block_top",
  grass_side: "grass_block_side",
  web: "cobweb",
  hardened_clay: "terracotta",
  ...Object.fromEntries(WOODS.flatMap(([o, n]) => [
    [`planks_${o}`, `${n}_planks`],
    [`log_${o}`, `${n}_log`],
    [`log_${o}_top`, `${n}_log_top`],
    [`leaves_${o}`, `${n}_leaves`],
  ])),
  ...Object.fromEntries(COLORS.flatMap((c) => [
    [`wool_colored_${c}`, `${color(c)}_wool`],
    [`glass_${c}`, `${color(c)}_stained_glass`],
    [`hardened_clay_stained_${c}`, `${color(c)}_terracotta`],
    [`concrete_${c}`, `${color(c)}_concrete`],
    [`concrete_powder_${c}`, `${color(c)}_concrete_powder`],
  ])),
};

const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([a, b]) => [b, a]));
export const ITEM_RENAMES_BACK = invert(ITEM_RENAMES);
export const BLOCK_RENAMES_BACK = invert(BLOCK_RENAMES);

/** Clave moderna de una textura: "item/golden_apple" aunque el pack sea de 1.8 ("items/apple_golden"). */
export function modernKey(path: string) {
  const p = path.replace(/^assets\/minecraft\/textures\//, "").replace(/\.png$/i, "");
  const m = p.match(/^(items|item|blocks|block)\/(.+)$/);
  if (!m) return p;
  const isItem = m[1].startsWith("item");
  const name = m[2];
  return `${isItem ? "item" : "block"}/${(isItem ? ITEM_RENAMES : BLOCK_RENAMES)[name] ?? name}`;
}

// ------------------------------------------------------------------ texturas que importan en PvP

export const PVP_SLOTS = [
  { key: "espadas", label: "Espadas", match: (k: string) => /^item\/[a-z_]*_sword$/.test(k) },
  { key: "manzanas", label: "Manzanas doradas", match: (k: string) => /^item\/(golden_apple|enchanted_golden_apple|golden_carrot)$/.test(k) },
  { key: "perlas", label: "Perlas y ojos de Ender", match: (k: string) => /^item\/(ender_pearl|ender_eye)$/.test(k) },
  { key: "pociones", label: "Pociones", match: (k: string) => /^item\/(potion|splash_potion|lingering_potion|potion_overlay|glass_bottle|experience_bottle)$/.test(k) },
  { key: "totem", label: "Tótem", match: (k: string) => k === "item/totem_of_undying" },
  { key: "armas", label: "Arco, ballesta, tridente y mazo", match: (k: string) => /^item\/(bow|bow_pulling_\d|crossbow.*|trident|mace|arrow|spectral_arrow|tipped_arrow.*)$/.test(k) },
  { key: "armaduras", label: "Armaduras", match: (k: string) => /^item\/[a-z_]*_(helmet|chestplate|leggings|boots)$/.test(k) || /^(models\/armor|entity\/equipment)\//.test(k) },
  { key: "cristal", label: "Cristal del End y anclas", match: (k: string) => /^(entity\/end_crystal\/|item\/end_crystal$|block\/respawn_anchor)/.test(k) },
  { key: "fuego", label: "Fuego", match: (k: string) => /^block\/(fire_[01]|soul_fire_[01])$/.test(k) },
  { key: "bloques", label: "Bloques de construcción", match: (k: string) => /^block\/(obsidian|cobblestone|stone|end_stone|.*_wool|.*_planks|glowstone|crying_obsidian)$/.test(k) },
  { key: "particulas", label: "Partículas", match: (k: string) => k.startsWith("particle/") },
  { key: "cielo", label: "Cielo y nubes", match: (k: string) => k.startsWith("environment/") },
  { key: "interfaz", label: "Interfaz (GUI)", match: (k: string) => k.startsWith("gui/") },
] as const;

/** Archivos de un pack que pertenecen a un grupo (incluye .png.mcmeta de animaciones). */
export function filesForSlot(pack: LoadedPack, slot: (typeof PVP_SLOTS)[number]) {
  const out: string[] = [];
  for (const path of pack.files.keys()) {
    const m = path.match(/^assets\/minecraft\/textures\/(.+)\.png(\.mcmeta)?$/i);
    if (m && slot.match(modernKey(`assets/minecraft/textures/${m[1]}.png`))) out.push(path);
  }
  return out;
}

export function pngUrl(b: Uint8Array) {
  return URL.createObjectURL(new Blob([b as BlobPart], { type: "image/png" }));
}
