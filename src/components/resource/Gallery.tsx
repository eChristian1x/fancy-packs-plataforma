"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./Gallery.module.css";

export type GalleryImage = { url: string; caption?: string | null; width?: number | null; height?: number | null };

/** Galería: imagen principal, miniaturas y vista ampliada. Flechas del teclado para moverse. */
export function Gallery({ images, name, pixelated = false }: { images: GalleryImage[]; name: string; pixelated?: boolean }) {
  const [i, setI] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const n = images.length;
  const go = (d: number) => setI((v) => (v + d + n) % n);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!el.open) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!n) return null;
  const cur = images[i];
  return (
    <div className={styles.galeria} data-pixel={pixelated || undefined}>
      <button type="button" className={styles.principal} onClick={() => dialog.current?.showModal()} aria-label={`Ampliar imagen ${i + 1} de ${n}`}>
        <Image src={cur.url} alt={cur.caption || `${name}, captura ${i + 1}`} fill sizes="(max-width: 960px) 94vw, 760px" priority />
      </button>
      {n > 1 && (
        <ul className={styles.miniaturas} aria-label="Capturas">
          {images.map((img, k) => (
            <li key={img.url}>
              <button type="button" onClick={() => setI(k)} aria-current={k === i || undefined} aria-label={`Ver captura ${k + 1}`}>
                <Image src={img.url} alt="" fill sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {cur.caption && <p className={styles.pie}>{cur.caption}</p>}

      <dialog ref={dialog} className={styles.visor} aria-label={`Galería de ${name}`} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className={styles.visorImg}>
          <Image src={cur.url} alt={cur.caption || `${name}, captura ${i + 1}`} fill sizes="100vw" />
        </div>
        <div className={styles.visorBarra}>
          <span className="num">
            {i + 1} / {n}
          </span>
          {n > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Anterior">
                <Icon name="chevronLeft" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Siguiente">
                <Icon name="chevronRight" />
              </button>
            </>
          )}
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
      </dialog>
    </div>
  );
}
