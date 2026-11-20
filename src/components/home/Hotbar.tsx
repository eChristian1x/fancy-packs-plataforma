"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";
import styles from "./Hotbar.module.css";

export type HotbarSlot = { key: string; name: string; count: number; href: string; icon: string };

/**
 * Navegación por modalidad con el vocabulario de la hotbar de Minecraft:
 * 9 casillas, el nombre del objeto "en la mano" arriba y el número de packs como pila de ítems.
 * Teclas 1–9 seleccionan casilla (como en el juego); flechas mueven la selección.
 */
export function Hotbar({ slots }: { slots: HotbarSlot[] }) {
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  const focus = (i: number) => {
    const n = (i + slots.length) % slots.length;
    setSel(n);
    refs.current[n]?.focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !/^[1-9]$/.test(e.key)) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
      const i = Number(e.key) - 1;
      if (i >= slots.length) return;
      // Solo si la hotbar está a la vista: no mover el foco a algo que no se ve.
      const r = refs.current[0]?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > innerHeight) return;
      setSel(i);
      refs.current[i]?.focus({ preventScroll: true });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [slots.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") focus(sel + 1);
    else if (e.key === "ArrowLeft") focus(sel - 1);
    else if (e.key === "Home") focus(0);
    else if (e.key === "End") focus(slots.length - 1);
    else return;
    e.preventDefault();
  };

  const held = slots[sel];

  return (
    <nav aria-label="Texturas por modalidad" className={styles.hotbar}>
      <p className={styles.mano} aria-hidden="true">
        <span className={styles.nombre}>{held.name}</span>
        <span className={styles.cuantos}>{held.count === 1 ? "1 pack" : `${held.count} packs`}</span>
      </p>
      <ul className={styles.casillas} onKeyDown={onKeyDown}>
        {slots.map((s, i) => (
          <li key={s.key} style={{ animationDelay: `${120 + i * 45}ms` }}>
            <Link
              ref={(el) => {
                refs.current[i] = el;
              }}
              href={s.href}
              className={styles.casilla}
              data-sel={i === sel || undefined}
              tabIndex={i === sel ? 0 : -1}
              aria-keyshortcuts={String(i + 1)}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
            >
              <PixelIcon name={s.icon} size={34} className={styles.icono} />
              {s.count > 1 && (
                <span className={styles.pila} aria-hidden="true">
                  {s.count > 99 ? "99+" : s.count}
                </span>
              )}
              <span className="solo-lectores">
                {s.name}, {s.count === 1 ? "1 pack" : `${s.count} packs`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.pista}>
        Pasa el cursor o usa las teclas <kbd>1</kbd>–<kbd>9</kbd>, como en el juego.
      </p>
    </nav>
  );
}
