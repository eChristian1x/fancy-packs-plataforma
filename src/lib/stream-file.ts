import "server-only";

/**
 * Sirve un archivo pasando sus bytes (sin redirigir). Lo usa la ruta del mod, porque no
 * sabemos si su cliente HTTP sigue redirecciones. `url` puede ser relativa al sitio.
 */
export async function streamFrom(url: string, req: Request, headers: Record<string, string>) {
  const abs = new URL(url, req.url);
  const upstream = await fetch(abs, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new Response("No se encontró el archivo.", { status: 404 });
  const h = new Headers(headers);
  const len = upstream.headers.get("content-length");
  if (len) h.set("Content-Length", len);
  return new Response(upstream.body, { status: 200, headers: h });
}
