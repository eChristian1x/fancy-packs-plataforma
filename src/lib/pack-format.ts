import { RESOURCE_PACK_FORMATS } from "./pack-format-table";
import { versionSortKey } from "./versions";

/** pack_format de una versión de Minecraft (o null si no se conoce). */
export function formatForVersion(v: string): number | null {
  return RESOURCE_PACK_FORMATS.find(([ver]) => ver === v)?.[1] ?? null;
}

const major = (n: number) => Math.floor(n);

/** Versiones estables cuyo pack_format (parte entera) está entre min y max. */
export function versionsForFormats(min: number, max: number): string[] {
  return RESOURCE_PACK_FORMATS.filter(([, f]) => major(f) >= major(min) && major(f) <= major(max)).map(([v]) => v);
}

export function sortedUnique(list: string[]): string[] {
  return [...new Set(list)].sort((a, b) => versionSortKey(a) - versionSortKey(b));
}

export type PackMeta = {
  description: string;
  packFormat: number | null;
  min: number | null;
  max: number | null;
};

const asNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (Array.isArray(v) && typeof v[0] === "number") return v[0] + (typeof v[1] === "number" ? v[1] / 10 : 0);
  return null;
};

function textOf(d: unknown): string {
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(textOf).join("");
  if (d && typeof d === "object") {
    const o = d as { text?: unknown; translate?: unknown; extra?: unknown };
    return textOf(o.text ?? o.translate ?? "") + (o.extra ? textOf(o.extra) : "");
  }
  return "";
}

/** Lee pack.mcmeta en cualquiera de sus formatos (pack_format, supported_formats, min_format/max_format). */
export function parsePackMcmeta(json: string): PackMeta {
  // Algunos packs traen comentarios o comas finales: se limpian antes de leer.
  const clean = json.replace(/^﻿/, "").replace(/\/\/[^\n]*/g, "").replace(/,\s*([}\]])/g, "$1");
  const root = JSON.parse(clean) as { pack?: Record<string, unknown> };
  const p = root.pack ?? {};
  const packFormat = asNum(p.pack_format);
  let min: number | null = asNum(p.min_format);
  let max: number | null = asNum(p.max_format);
  const sf = p.supported_formats as unknown;
  if (min == null && max == null && sf != null) {
    if (typeof sf === "number") min = max = sf;
    else if (Array.isArray(sf)) [min, max] = [asNum(sf[0]), asNum(sf[1])];
    else if (typeof sf === "object") {
      const o = sf as { min_inclusive?: unknown; max_inclusive?: unknown };
      [min, max] = [asNum(o.min_inclusive), asNum(o.max_inclusive)];
    }
  }
  if (min == null) min = packFormat;
  if (max == null) max = packFormat;
  return { description: textOf(p.description).replace(/§./g, "").trim(), packFormat, min, max };
}

/** Versiones compatibles según pack.mcmeta. */
export function versionsFromMeta(m: PackMeta): string[] {
  if (m.min == null || m.max == null) return [];
  return versionsForFormats(m.min, m.max);
}
