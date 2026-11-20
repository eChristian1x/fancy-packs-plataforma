"use client";

import { useRef, useState } from "react";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, toWebp, uploadToStorage } from "@/lib/upload-client";
import styles from "./Upload.module.css";

/**
 * Elige una imagen, la reduce a WebP y la sube a Storage. Devuelve la ruta subida con onUploaded.
 * `max` es el lado mayor en píxeles (256 para avatares, 1920 para capturas).
 */
export function ImagePicker({
  userId,
  max,
  label,
  help,
  pixelated,
  onUploaded,
  disabled,
}: {
  userId: string;
  max: number;
  label: string;
  help?: string;
  pixelated?: boolean;
  onUploaded: (path: string, size: { width: number; height: number }) => Promise<void> | void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handle(file: File) {
    setError("");
    if (!IMAGE_TYPES.includes(file.type)) return setError("Usa una imagen PNG, JPG, WebP o GIF.");
    if (file.size > MAX_IMAGE_BYTES) return setError("La imagen pesa más de 8 MB.");
    try {
      setBusy("Preparando…");
      const { blob, width, height } = await toWebp(file, max, pixelated);
      setBusy("Subiendo…");
      const path = await uploadToStorage("imagenes", userId, blob, file.name, (p) => setBusy(`Subiendo ${p}%`));
      setBusy("Guardando…");
      await onUploaded(path, { width, height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={styles.picker}>
      <label className={`boton boton-secundario boton-chico ${styles.elegir}`} aria-disabled={disabled || !!busy || undefined}>
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="solo-lectores"
          disabled={disabled || !!busy}
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
        {busy ?? label}
      </label>
      {help && !error && <p className={styles.ayuda}>{help}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
