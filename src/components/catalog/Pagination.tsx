import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { catalogHref, type CatalogQuery } from "@/lib/catalog-params";
import styles from "./Pagination.module.css";

/** Páginas con números: cada página tiene su URL (se puede compartir y la indexan los buscadores). */
export function Pagination({ base, query, page, pages }: { base: string; query: CatalogQuery; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => catalogHref(base, query, { pagina: p });
  // 1 … 4 5 [6] 7 8 … 20
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) items.push("gap");
    items.push(p);
  });
  return (
    <nav className={styles.paginas} aria-label="Páginas">
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.paso} rel="prev">
          <Icon name="chevronLeft" size={18} />
          Anterior
        </Link>
      ) : (
        <span className={styles.paso} aria-disabled="true">
          <Icon name="chevronLeft" size={18} />
          Anterior
        </span>
      )}
      <ol>
        {items.map((p, i) =>
          p === "gap" ? (
            <li key={`g${i}`} className={styles.hueco} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <Link href={href(p)} className={`${styles.num} num`} aria-current={p === page ? "page" : undefined} aria-label={`Página ${p}`}>
                {p}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link href={href(page + 1)} className={styles.paso} rel="next">
          Siguiente
          <Icon name="chevronRight" size={18} />
        </Link>
      ) : (
        <span className={styles.paso} aria-disabled="true">
          Siguiente
          <Icon name="chevronRight" size={18} />
        </span>
      )}
    </nav>
  );
}
