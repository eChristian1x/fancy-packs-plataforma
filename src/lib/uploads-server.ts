import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DEV_MODE } from "./dev";
import sharp from "sharp";
import { featuresFromRgba256 } from "./image-features";
import { BUCKET_FILES, BUCKET_IMAGES, publicUrl } from "./storage";
import { supabaseServer } from "./supabase/server";
import { MAX_UPLOAD_BYTES } from "./zip-inspect";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Ruta subida por el propio usuario: <su id>/… sin trucos (.., barras dobles). */
export function ownsPath(userId: string, path: string, kind: "file" | "image") {
  if (!path.startsWith(`${userId}/`) || path.includes("..") || path.includes("//")) return false;
  return kind === "image"
    ? /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(path)
    : /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}\.(zip|jar)$/i.test(path);
}

/** Descarga lo que el usuario subió a Storage (los buckets son de lectura pública). */
export const devStoragePath = (bucket: string, p: string) => path.join(process.cwd(), ".data", "storage", bucket, ...p.split("/"));

export async function fetchObject(bucket: string, objectPath: string, max: number): Promise<Uint8Array> {
  if (DEV_MODE) {
    const buf = await fs.readFile(devStoragePath(bucket, objectPath)).catch(() => null);
    if (!buf) throw new Error("No encontré el archivo subido. Vuelve a subirlo.");
    if (buf.byteLength > max) throw new Error("El archivo es más grande de lo permitido.");
    return new Uint8Array(buf);
  }
  const res = await fetch(publicUrl(bucket, objectPath), { cache: "no-store" });
  if (!res.ok || !res.body) throw new Error("No encontré el archivo subido. Vuelve a subirlo.");
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > max) throw new Error("El archivo es más grande de lo permitido.");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > max) throw new Error("El archivo es más grande de lo permitido.");
  return buf;
}

export const fetchUploadedFile = (path: string) => fetchObject(BUCKET_FILES, path, MAX_UPLOAD_BYTES);

export function hashes(buf: Uint8Array) {
  return {
    sha1: createHash("sha1").update(buf).digest("hex"),
    sha512: createHash("sha512").update(buf).digest("hex"),
  };
}

/** Comprueba que sea una imagen de verdad, devuelve su tamaño y su huella visual. */
export async function processImage(path: string) {
  const buf = Buffer.from(await fetchObject(BUCKET_IMAGES, path, MAX_IMAGE_BYTES));
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new Error("El archivo no es una imagen válida.");
  }
  if (!meta.format || !["webp", "png", "jpeg", "gif"].includes(meta.format)) throw new Error("Formato de imagen no permitido.");
  if (!meta.width || !meta.height || meta.width > 8192 || meta.height > 8192) throw new Error("La imagen es demasiado grande.");
  const raw = await sharp(buf).resize(256, 256, { fit: "fill", kernel: "linear" }).ensureAlpha().raw().toBuffer();
  return { url: publicUrl(BUCKET_IMAGES, path), width: meta.width, height: meta.height, vector: featuresFromRgba256(new Uint8Array(raw)) };
}

/** Huella de una imagen por URL (absoluta o del propio sitio). Sirve para completar huellas que falten. */
export async function featuresFromUrl(url: string, siteUrl: string) {
  const res = await fetch(new URL(url, siteUrl), { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`No se pudo leer ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("Imagen demasiado grande");
  const raw = await sharp(buf).resize(256, 256, { fit: "fill", kernel: "linear" }).ensureAlpha().raw().toBuffer();
  return featuresFromRgba256(new Uint8Array(raw));
}

/** Borra archivos del propio usuario en Storage (con su sesión; las políticas lo limitan a su carpeta). */
export async function removeOwnObjects(bucket: string, paths: string[]) {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  if (DEV_MODE) {
    await Promise.all(list.map((p) => fs.rm(devStoragePath(bucket, p), { force: true })));
    return;
  }
  try {
    const supabase = await supabaseServer();
    await supabase.storage.from(bucket).remove(list);
  } catch (e) {
    console.error("[storage] no se pudo borrar", e);
  }
}
