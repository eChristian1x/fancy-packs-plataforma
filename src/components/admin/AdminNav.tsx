"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Admin.module.css";

export function AdminNav({ counts }: { counts: { pending: number; reports: number } }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/pendientes", label: "Por revisar", n: counts.pending },
    { href: "/admin/reportes", label: "Reportes", n: counts.reports },
    { href: "/admin/recursos", label: "Publicaciones" },
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/categorias", label: "Categorías" },
    { href: "/admin/descargas", label: "Descargas" },
  ];
  return (
    <nav className={styles.menu} aria-label="Administración">
      <p>Administración</p>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path === i.href ? "page" : undefined}>
          {i.label}
          {!!i.n && <span>{i.n}</span>}
        </Link>
      ))}
    </nav>
  );
}
