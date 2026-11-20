import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import styles from "@/components/tools/Tools.module.css";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Herramientas",
  description: "Busca packs por captura, compara, revisa, convierte y combina resource packs de Minecraft. Todo en tu navegador.",
  alternates: { canonical: "/herramientas" },
};

const ICON: Record<string, IconName> = {
  "buscar-por-captura": "search",
  visor: "texture",
  comparador: "overlay",
  analizador: "check",
  convertidor: "versions",
  personalizador: "tools",
};

export default function Page() {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <Breadcrumbs items={[{ href: "/", label: "Inicio" }, { href: "/herramientas", label: "Herramientas" }]} />
      <header className={styles.cabeza}>
        <h1>Herramientas</h1>
        <p>Para encontrar, revisar y armar packs. Los archivos se abren en tu navegador: no se suben a ningún lado.</p>
      </header>
      <ul className={styles.indice}>
        {TOOLS.map((t, i) => (
          <li key={t.slug} className={`${styles.herramienta} ${i === 0 ? styles.destacada : ""}`}>
            <Icon name={ICON[t.slug]} size={i === 0 ? 32 : 24} />
            <h2>
              <Link href={`/herramientas/${t.slug}`}>{t.name}</Link>
            </h2>
            <p>{i === 0 ? t.intro : t.short}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
