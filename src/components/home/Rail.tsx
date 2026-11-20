"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./Rail.module.css";

/** Carrusel horizontal con scroll nativo (táctil y teclado) y botones para mouse. */
export function Rail({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={styles.rail}>
      <ul ref={ref} className={styles.pista} aria-label={label}>
        {children}
      </ul>
      <div className={styles.botones}>
        <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label="Anteriores">
          <Icon name="chevronLeft" size={18} />
        </button>
        <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label="Siguientes">
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
}
