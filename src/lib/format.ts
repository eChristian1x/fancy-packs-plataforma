const compact = new Intl.NumberFormat("es-MX", { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("es-MX");
const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

/** 48210 → "48.2 mil" */
export function compactNumber(n: number) {
  return n < 10_000 ? full.format(n) : compact.format(n);
}

export function fullNumber(n: number) {
  return full.format(n);
}

/** "hace 3 días", "ayer", "hace 2 meses" */
export function relativeDate(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const diff = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function shortDate(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "";
}

export function plural(n: number, one: string, many: string) {
  return `${fullNumber(n)} ${n === 1 ? one : many}`;
}
