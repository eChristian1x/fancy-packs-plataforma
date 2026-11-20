import Image from "next/image";
import Link from "next/link";
import type { ResourceCard } from "@/lib/queries/resources";
import { resourceHref } from "@/lib/routes";
import { Author, CategoryChips, Downloads, SampleTag, Versions } from "./parts";
import styles from "./TextureCard.module.css";

/** Tarjeta principal de texturas y overlays: portada grande y los datos con los que se elige un pack. */
export function TextureCard({ r, priority = false, variant }: { r: ResourceCard; priority?: boolean; variant?: "catalogo" }) {
  const href = resourceHref(r.type, r.slug);
  const img = r.coverUrl ?? r.iconUrl;
  return (
    <article className={`${styles.card} ${variant === "catalogo" ? styles.catalogo : ""}`}>
      <div className={styles.portada}>
        {img ? (
          <Image src={img} alt="" fill sizes="(max-width: 640px) 85vw, (max-width: 1100px) 45vw, 300px" priority={priority} />
        ) : (
          <div className={styles.sinImagen} aria-hidden="true" />
        )}
        <div className={styles.sobre}>
          {r.featured && <span className="chip chip-miel chip-sobre">Destacado</span>}
          {r.isSample && <SampleTag />}
        </div>
        {r.resolution && <span className={`chip chip-res ${styles.res}`}>{r.resolution}x</span>}
      </div>
      <div className={styles.cuerpo}>
        <div>
          <h3 className={styles.titulo}>
            <Link href={href} className={styles.enlace}>
              {r.name}
            </Link>
          </h3>
          <Author r={r} />
        </div>
        <CategoryChips r={r} />
        <div className={styles.meta}>
          <Versions list={r.mcVersions} />
          <Downloads n={r.downloadCount} />
        </div>
      </div>
    </article>
  );
}
