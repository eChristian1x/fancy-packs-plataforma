import Image from "next/image";
import Link from "next/link";
import { relativeDate, shortDate } from "@/lib/format";
import type { ResourceCard } from "@/lib/queries/resources";
import { creatorHref, resourceHref } from "@/lib/routes";
import { Downloads, Versions } from "./parts";
import styles from "./ResourceRow.module.css";

/** Lista densa: para recorrer muchos packs nuevos de un vistazo. */
export function ResourceRows({ items, now }: { items: ResourceCard[]; now: number }) {
  return (
    <div className={styles.tabla}>
      <div className={styles.cabecera} aria-hidden="true">
        <span />
        <span>Pack</span>
        <span>Res.</span>
        <span>Minecraft</span>
        <span>Publicado</span>
        <span className={styles.der}>Descargas</span>
      </div>
      <ul>
        {items.map((r) => (
          <li key={r.id} className={styles.fila}>
            <div className={styles.mini}>
              {r.coverUrl && <Image src={r.coverUrl} alt="" fill sizes="96px" />}
            </div>
            <div className={styles.principal}>
              <h3>
                <Link href={resourceHref(r.type, r.slug)} className={styles.enlace}>
                  {r.name}
                </Link>
              </h3>
              <p>
                <Link href={creatorHref(r.ownerUsername)} className={styles.encima}>
                  {r.authorName}
                </Link>
                {r.categories.length > 0 && <span className={styles.cats}>{r.categories.map((c) => c.name).join(", ")}</span>}
              </p>
            </div>
            <span className={styles.res}>
              <span className="solo-lectores">Resolución </span>
              {r.resolution ? `${r.resolution}x` : "—"}
            </span>
            <Versions list={r.mcVersions} className={styles.ver} />
            <time className={styles.fecha} dateTime={r.publishedAt ?? undefined} title={shortDate(r.publishedAt)}>
              {relativeDate(r.publishedAt, now)}
            </time>
            <Downloads n={r.downloadCount} className={styles.der} />
          </li>
        ))}
      </ul>
    </div>
  );
}
