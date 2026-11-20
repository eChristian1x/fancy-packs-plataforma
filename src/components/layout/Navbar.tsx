"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import styles from "./Navbar.module.css";

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/texturas", label: "Texturas" },
  { href: "/mods", label: "Mods" },
  { href: "/overlays", label: "Overlays" },
  { href: "/herramientas", label: "Herramientas" },
  { href: "/comunidad", label: "Comunidad" },
] as const;

export type NavUser = { username: string; displayName: string } | null;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Cerrar el menú al navegar
  useEffect(() => setOpen(false), [pathname]);

  // "/" enfoca el buscador (como en muchas plataformas de descargas)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const input = searchRef.current;
      if (!input || input.offsetParent === null) return;
      e.preventDefault();
      input.focus();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    // El panel empieza justo debajo de la barra, esté donde esté (con o sin aviso arriba).
    setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const account = user ? (
    <Link href={`/creadores/${user.username}`} className={styles.perfil} aria-label={`Tu perfil: ${user.displayName}`}>
      <PixelAvatar seed={user.username} size={32} />
    </Link>
  ) : (
    <Link href="/entrar" className="boton boton-principal boton-chico">
      Iniciar sesión
    </Link>
  );

  return (
    <header className={styles.nav} ref={headerRef}>
      <div className={`contenedor ${styles.fila}`}>
        <Link href="/" className={styles.logo} aria-label="Fancy Packs, ir al inicio">
          <Image src="/brand/logo.png" alt="" width={70} height={46} priority />
        </Link>

        <nav aria-label="Principal" className={styles.enlaces}>
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form role="search" aria-label="Búsqueda rápida" action="/buscar" className={styles.buscar}>
          <Icon name="search" size={18} />
          <input
            ref={searchRef}
            type="search"
            name="q"
            placeholder="Buscar packs, mods o creadores"
            aria-label="Buscar en Fancy Packs"
            autoComplete="off"
            enterKeyHint="search"
          />
          <kbd aria-hidden="true">/</kbd>
        </form>

        <div className={styles.cuenta}>{account}</div>

        <button
          type="button"
          className={styles.menuBoton}
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} size={22} />
          <span className="solo-lectores">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
      </div>

      <div
        id="menu-movil"
        className={styles.movil}
        data-open={open}
        hidden={!open}
        style={menuTop != null ? ({ "--menu-top": `${menuTop}px` } as React.CSSProperties) : undefined}
      >
        <form role="search" aria-label="Búsqueda en el menú" action="/buscar" className={styles.buscarMovil}>
          <Icon name="search" size={18} />
          <input type="search" name="q" placeholder="Buscar packs, mods o creadores" aria-label="Buscar en Fancy Packs" enterKeyHint="search" />
        </form>
        <nav aria-label="Principal (móvil)">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
                  {l.label}
                  <Icon name="chevronRight" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.cuentaMovil}>{account}</div>
      </div>
    </header>
  );
}
