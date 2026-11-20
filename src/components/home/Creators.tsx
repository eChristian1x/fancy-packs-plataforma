import Link from "next/link";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { compactNumber, fullNumber, plural } from "@/lib/format";
import type { CreatorSummary } from "@/lib/queries/resources";
import { creatorHref } from "@/lib/routes";
import styles from "./Creators.module.css";

/** Creadores con más descargas. */
export function Creators({ items }: { items: CreatorSummary[] }) {
  return (
    <ol className={styles.lista}>
      {items.map((c) => (
        <li key={c.username}>
          <Link href={creatorHref(c.username)} className={styles.creador}>
            <PixelAvatar seed={c.username} size={44} className={styles.avatar} />
            <span className={styles.nombre}>
              <b>{c.displayName}</b>
              <span>{plural(c.resources, "publicación", "publicaciones")}</span>
            </span>
            <span className={`${styles.descargas} num`} title={`${fullNumber(c.downloads)} descargas`}>
              {compactNumber(c.downloads)}
              <span>descargas</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
