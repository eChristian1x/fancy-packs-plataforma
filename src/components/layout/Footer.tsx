import Image from "next/image";
import Link from "next/link";
import type { SiteInfo } from "@/lib/queries/resources";
import styles from "./Footer.module.css";

const COLUMNS = [
  {
    title: "Explorar",
    links: [
      { href: "/texturas", label: "Texturas" },
      { href: "/overlays", label: "Overlays" },
      { href: "/mods", label: "Mods" },
      { href: "/herramientas", label: "Herramientas" },
    ],
  },
  {
    title: "Comunidad",
    links: [
      { href: "/comunidad", label: "Creadores" },
      { href: "/publicar", label: "Publicar un pack" },
      { href: "/reglas", label: "Reglas de publicación" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/ayuda/instalar", label: "Cómo instalar un pack" },
      { href: "/api/v1/packs.json", label: "API para el mod" },
    ],
  },
];

export function Footer({ site }: { site: SiteInfo }) {
  return (
    <footer className={styles.pie}>
      <div className={`contenedor ${styles.grid}`}>
        <div className={styles.marca}>
          <Image src="/brand/logo.png" alt="Fancy Packs" width={110} height={73} />
          <p>{site.tagline}. Todo se publica con permiso de su creador.</p>
          {site.contact && (
            <p className={styles.contacto}>
              ¿Eres creador y quieres agregar o quitar un pack? <span>{site.contact}</span>
            </p>
          )}
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title} className={styles.col}>
            <h2>{c.title}</h2>
            <ul>
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="contenedor">
        <div className={styles.legal}>
        <p>
          Instala los packs sin reiniciar con el mod <b>Fancy Packs · Texturas</b> para Fabric.
        </p>
        <p>No es un producto oficial de Minecraft. No está aprobado por Mojang ni Microsoft, ni asociado con ellos.</p>
        </div>
      </div>
    </footer>
  );
}
