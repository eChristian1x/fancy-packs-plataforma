import Link from "next/link";
import styles from "./Account.module.css";

/** Pestañas como enlaces (cada una tiene su URL y funciona sin JavaScript). */
export function Tabs({ items, current, label }: { items: { key: string; href: string; label: string; count?: number }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      <ul>
        {items.map((t) => (
          <li key={t.key}>
            <Link href={t.href} aria-current={t.key === current ? "page" : undefined} scroll={false}>
              {t.label}
              {t.count != null && <span className="num">{t.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
