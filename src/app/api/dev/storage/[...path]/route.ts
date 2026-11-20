import fs from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "@/lib/auth/session";
import { DEV_MODE } from "@/lib/dev";
import { devStoragePath } from "@/lib/uploads-server";

/** Almacenamiento del modo local (sin Supabase). En producción responde 404. */
const BUCKETS = new Set(["archivos", "imagenes"]);
const MAX = { archivos: 50 * 1024 * 1024, imagenes: 8 * 1024 * 1024 } as const;

function parse(parts: string[]) {
  const [bucket, ...rest] = parts;
  const p = rest.join("/");
  if (!BUCKETS.has(bucket) || !p || p.includes("..")) return null;
  return { bucket: bucket as keyof typeof MAX, p };
}

export async function GET(_req: Request, ctx: RouteContext<"/api/dev/storage/[...path]">) {
  if (!DEV_MODE) return new Response("No existe.", { status: 404 });
  const t = parse((await ctx.params).path);
  if (!t) return new Response("No existe.", { status: 404 });
  const buf = await fs.readFile(devStoragePath(t.bucket, t.p)).catch(() => null);
  if (!buf) return new Response("No existe.", { status: 404 });
  const type = t.p.endsWith(".webp") ? "image/webp" : t.p.endsWith(".jar") ? "application/java-archive" : "application/zip";
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: RouteContext<"/api/dev/storage/[...path]">) {
  if (!DEV_MODE) return new Response("No existe.", { status: 404 });
  const t = parse((await ctx.params).path);
  const user = await getSessionUser();
  if (!t || !user || !t.p.startsWith(`${user.id}/`)) return Response.json({ message: "Sin permiso" }, { status: 403 });
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > MAX[t.bucket]) return Response.json({ message: "Payload too large: exceeded size" }, { status: 413 });
  const file = devStoragePath(t.bucket, t.p);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf, { flag: "wx" }).catch(() => null);
  return Response.json({ Key: `${t.bucket}/${t.p}` });
}
