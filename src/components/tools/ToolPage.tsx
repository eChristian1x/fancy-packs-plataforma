import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { TOOLS, type ToolSlug } from "@/lib/tools";
import styles from "./Tools.module.css";

export function toolMetadata(slug: ToolSlug) {
  const t = TOOLS.find((x) => x.slug === slug)!;
  return { title: `${t.name} · Herramientas`, description: t.short, alternates: { canonical: `/herramientas/${slug}` } };
}

/** Marco de cada herramienta: ruta, título, explicación y la herramienta. */
export function ToolPage({ slug, children }: { slug: ToolSlug; children: React.ReactNode }) {
  const t = TOOLS.find((x) => x.slug === slug)!;
  const others = TOOLS.filter((x) => x.slug !== slug);
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <Breadcrumbs items={[{ href: "/", label: "Inicio" }, { href: "/herramientas", label: "Herramientas" }, { href: `/herramientas/${slug}`, label: t.name }]} />
      <header className={styles.cabeza}>
        <h1>{t.name}</h1>
        <p>{t.intro}</p>
      </header>
      {children}
      <nav aria-label="Otras herramientas" className={styles.barra} style={{ marginTop: 24 }}>
        <span className={styles.nota}>Otras herramientas:</span>
        {others.map((o) => (
          <Link key={o.slug} href={`/herramientas/${o.slug}`} className={styles.filtro}>
            {o.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
