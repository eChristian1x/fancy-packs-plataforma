/** Solo rutas internas: evita redirecciones abiertas a otros sitios (?siguiente=https://…). */
export function safeNext(v: unknown, fallback = "/") {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}
