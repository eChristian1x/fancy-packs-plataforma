import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import styles from "./Breadcrumbs.module.css";

/** Ruta de navegación + datos estructurados (BreadcrumbList) para buscadores. */
export function Breadcrumbs({ items }: { items: { href: string; label: string }[] }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: SITE_URL + it.href })),
  };
  return (
    <nav aria-label="Ruta" className={styles.ruta}>
      <ol>
        {items.map((it, i) => (
          <li key={it.href}>
            {i === items.length - 1 ? <span aria-current="page">{it.label}</span> : <Link href={it.href}>{it.label}</Link>}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
