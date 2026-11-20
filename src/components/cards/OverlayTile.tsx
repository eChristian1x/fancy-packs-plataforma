import Image from "next/image";
import Link from "next/link";
import type { ResourceCard } from "@/lib/queries/resources";
import { resourceHref } from "@/lib/routes";
import { Downloads, SampleTag, Versions } from "./parts";
import styles from "./OverlayTile.module.css";

/** Pieza compacta para el carrusel de overlays: imagen y nombre, sin caja alrededor. */
export function OverlayTile({ r }: { r: ResourceCard }) {
  return (
    <article className={styles.tile}>
      <div className={styles.img}>
        {r.coverUrl && <Image src={r.coverUrl} alt="" fill sizes="260px" />}
        {r.isSample && (
          <span className={styles.ejemplo}>
            <SampleTag />
          </span>
        )}
      </div>
      <h3>
        <Link href={resourceHref(r.type, r.slug)} className={styles.enlace}>
          {r.name}
        </Link>
      </h3>
      <p className={styles.resumen}>{r.summary}</p>
      <div className={styles.meta}>
        <Versions list={r.mcVersions} />
        <Downloads n={r.downloadCount} />
      </div>
    </article>
  );
}
