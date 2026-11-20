"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./NavProgress.module.css";

/**
 * Barra de progreso arriba de la página mientras carga la siguiente.
 * Las páginas se envían completas (sin streaming) para que lleguen enteras a buscadores y
 * a quien navega sin JavaScript; esta barra es la señal de "cargando" al cambiar de página.
 * Los enlaces que manejan su propia carga (filtros del catálogo) llaman preventDefault y no la activan.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => setActive(false), [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <div className={styles.barra} data-on={active || undefined} aria-hidden="true" />;
}
