/** Utilidades para versiones de Minecraft (1.21.11, 26.2…). */
export function versionSortKey(v: string) {
  const [a = 0, b = 0, c = 0] = v.split(".").map((n) => Number.parseInt(n, 10) || 0);
  return a * 1_000_000 + b * 1_000 + c;
}

export function sortVersions(list: readonly string[]) {
  return [...list].sort((x, y) => versionSortKey(x) - versionSortKey(y));
}

/** "1.21.11" o "1.21.11 – 26.2" */
export function versionRange(list: readonly string[]) {
  if (!list.length) return "";
  const s = sortVersions(list);
  return s.length === 1 ? s[0] : `${s[0]} – ${s[s.length - 1]}`;
}
