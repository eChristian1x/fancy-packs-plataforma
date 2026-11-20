/**
 * ¿Una versión de Minecraft entra en el rango que declara un mod?
 * Entiende los formatos de Fabric (">=1.21 <=26.2", "~1.21", "1.21.x", "*")
 * y de Forge/NeoForge ("[1.20.1,1.21)", "[1.21,)").
 */
import { versionSortKey as key } from "./versions";

function cmp(op: string, v: number, t: number) {
  switch (op) {
    case ">=": return v >= t;
    case ">": return v > t;
    case "<=": return v <= t;
    case "<": return v < t;
    default: return v === t;
  }
}

export function inRange(version: string, range: string | null | undefined): boolean {
  if (!range) return false;
  const r = range.trim();
  if (r === "*" || r === "") return true;
  const v = key(version);
  // Maven: [a,b) (a,b] [a,] [a]
  const m = r.match(/^([[(])\s*([^,\])]*)\s*(?:,\s*([^\])]*))?\s*([\])])$/);
  if (m) {
    const [, lo, a, b, hi] = m;
    if (b === undefined) return v === key(a);
    if (a && !(lo === "[" ? v >= key(a) : v > key(a))) return false;
    if (b && !(hi === "]" ? v <= key(b) : v < key(b))) return false;
    return true;
  }
  // Varias alternativas con "||"
  if (r.includes("||")) return r.split("||").some((p) => inRange(version, p));
  return r.split(/\s+/).every((part) => {
    const x = part.match(/^(>=|<=|>|<|=|~|\^)?(.+)$/);
    if (!x) return false;
    const [, op = "=", raw] = x;
    if (/\.x$|\.\*$/.test(raw)) return version.startsWith(raw.replace(/\.(x|\*)$/, "") + ".") || version === raw.replace(/\.(x|\*)$/, "");
    if (op === "~" || op === "^") {
      const base = raw.split(".").slice(0, 2).join(".");
      return v >= key(raw) && (version === base || version.startsWith(base + "."));
    }
    return cmp(op, v, key(raw));
  });
}
