"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Reduce la imagen (lado mayor ≤ max) y la convierte a WebP en el navegador antes de subirla. */
export async function toWebp(file: Blob, max: number, pixelated = false): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = !pixelated;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.9));
  if (!blob) throw new Error("Tu navegador no pudo procesar la imagen.");
  return { blob, width: w, height: h };
}

const safeName = (n: string) =>
  n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-100) || "archivo";

/**
 * Sube un archivo a Supabase Storage dentro de la carpeta del usuario, con progreso.
 * Las políticas del bucket solo permiten escribir en <id del usuario>/…
 */
export async function uploadToStorage(
  bucket: "archivos" | "imagenes",
  userId: string,
  body: Blob,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const local = !SUPABASE_URL; // modo local de desarrollo (lib/dev.ts)
  const token = local ? "" : (await supabaseBrowser().auth.getSession()).data.session?.access_token;
  if (!local && !token) throw new Error("Tu sesión venció. Vuelve a iniciar sesión.");
  const path = bucket === "imagenes" ? `${userId}/${crypto.randomUUID()}.webp` : `${userId}/${crypto.randomUUID()}/${safeName(fileName)}`;
  const type = bucket === "imagenes" ? "image/webp" : fileName.endsWith(".jar") ? "application/java-archive" : "application/zip";
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const enc = path.split("/").map(encodeURIComponent).join("/");
    xhr.open("POST", local ? `/api/dev/storage/${bucket}/${enc}` : `${SUPABASE_URL}/storage/v1/object/${bucket}/${enc}`);
    if (!local) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
    }
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = "No se pudo subir el archivo.";
      try {
        const j = JSON.parse(xhr.responseText);
        if (/size|exceed/i.test(j.message ?? j.error ?? "")) msg = "El archivo es más grande de lo permitido.";
        else if (/mime|type/i.test(j.message ?? "")) msg = "Ese tipo de archivo no se permite.";
        else if (xhr.status === 403 || xhr.status === 401) msg = "No tienes permiso para subir aquí. Vuelve a iniciar sesión.";
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Se cortó la conexión mientras subía el archivo."));
    xhr.send(body);
  });
  return path;
}
