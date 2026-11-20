import Image from "next/image";
import Link from "next/link";
import type { ResourceCard } from "@/lib/queries/resources";
import { resourceHref } from "@/lib/routes";
import { Author, Downloads, Loaders, SampleTag, Versions } from "./parts";
import styles from "./ModCard.module.css";

/** Tarjeta horizontal para mods: lo importante es el loader y la versión, no una portada grande. */
export function ModCard({ r }: { r: ResourceCard }) {
  return (
    <article className={styles.mod}>
      <div className={styles.icono}>
        {r.iconUrl ? <Image src={r.iconUrl} alt="" width={64} height={64} /> : <span aria-hidden="true">{r.name[0]}</span>}
      </div>
      <div className={styles.cuerpo}>
        <div className={styles.cabeza}>
          <h3>
            <Link href={resourceHref(r.type, r.slug)} className={styles.enlace}>
              {r.name}
            </Link>
          </h3>
          {r.isSample && <SampleTag />}
        </div>
        <Author r={r} />
        <p className={styles.resumen}>{r.summary}</p>
        <Loaders list={r.loaders} />
        <div className={styles.meta}>
          <Versions list={r.mcVersions} />
          <Downloads n={r.downloadCount} />
        </div>
      </div>
    </article>
  );
}
