/**
 * Archivos en Supabase Storage.
 *   archivos/<usuario>/<uuid>/<nombre>.zip|.jar   packs y mods
 *   imagenes/<usuario>/<uuid>.webp                portadas, galerías y avatares
 * Los dos buckets son de lectura pública; solo se escribe con sesión iniciada en la carpeta propia.
 * Una ruta que empieza con "/" es un archivo estático del sitio (contenido de ejemplo).
 */
export const BUCKET_FILES = "archivos";
export const BUCKET_IMAGES = "imagenes";

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");

export function publicUrl(bucket: string, path: string) {
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export const fileUrl = (storagePath: string) => publicUrl(BUCKET_FILES, storagePath);
