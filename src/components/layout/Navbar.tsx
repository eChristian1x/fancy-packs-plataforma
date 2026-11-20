"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/lib/actions/auth";
import styles from "./Navbar.module.css";

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/texturas", label: "Texturas" },
  { href: "/mods", label: "Mods" },
  { href: "/overlays", label: "Overlays" },
  { href: "/herramientas", label: "Herramientas" },
  { href: "/comunidad", label: "Comunidad" },
] as const;

export type NavUser = { username: string; displayName: string; avatarUrl: string | null; staff: boolean } | null;

function UserMenu({ user, pathname }: { user: NonNullable<NavUser>; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open]);
  const links = [
    { href: `/creadores/${user.username}`, label: "Mi perfil" },
    { href: "/cuenta", label: "Favoritos y descargas" },
    { href: "/panel", label: "Mis publicaciones" },
    { href: "/publicar", label: "Publicar" },
    ...(user.staff ? [{ href: "/admin", label: "Administración" }] : []),
    { href: "/cuenta/ajustes", label: "Ajustes de la cuenta" },
  ];
  return (
    <div className={styles.usuario} ref={ref}>
      <button type="button" className={styles.perfil} aria-expanded={open} aria-controls="menu-usuario" onClick={() => setOpen((v) => !v)}>
        <Avatar seed={user.username} src={user.avatarUrl} size={32} />
        <span className="solo-lectores">Menú de {user.displayName}</span>
      </button>
      <div id="menu-usuario" className={styles.desplegable} hidden={!open}>
        <p className={styles.quien}>
          <b>{user.displayName}</b>
          <span>@{user.username}</span>
        </p>
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action={signOut}>
          <button type="submit" className={styles.salir}>
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

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

  const login = (
    <Link href={`/entrar${pathname !== "/" && !pathname.startsWith("/entrar") ? `?siguiente=${encodeURIComponent(pathname)}` : ""}`} className="boton boton-principal boton-chico">
      Iniciar sesión
    </Link>
  );
  const account = user ? <UserMenu user={user} pathname={pathname} /> : login;
  const accountMobile = user ? (
    <ul className={styles.cuentaLista}>
      <li><Link href={`/creadores/${user.username}`}>Mi perfil</Link></li>
      <li><Link href="/cuenta">Favoritos y descargas</Link></li>
      <li><Link href="/panel">Mis publicaciones</Link></li>
      {user.staff && <li><Link href="/admin">Administración</Link></li>}
      <li><Link href="/cuenta/ajustes">Ajustes</Link></li>
      <li>
        <form action={signOut}>
          <button type="submit">Cerrar sesión</button>
        </form>
      </li>
    </ul>
  ) : (
    login
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
        <div className={styles.cuentaMovil}>{accountMobile}</div>
      </div>
    </header>
  );
}
