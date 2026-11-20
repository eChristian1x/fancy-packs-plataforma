import Image from "next/image";
import Link from "next/link";
import { Author, CategoryChips, Downloads, Loaders, SampleTag, Versions } from "@/components/cards/parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { ResourceCard } from "@/lib/queries/resources";
import { resourceHref, TYPE_LABEL } from "@/lib/routes";
import styles from "./Recommended.module.css";

const TYPE_ICON: Record<string, IconName> = { texture: "texture", overlay: "overlay", mod: "mod" };

function TypeLabel({ r }: { r: ResourceCard }) {
  return (
    <span className={styles.tipo}>
      <Icon name={TYPE_ICON[r.type] ?? "texture"} size={15} />
      {TYPE_LABEL[r.type].one}
    </span>
  );
}

/** Selección del equipo: una pieza grande y varias secundarias, de cualquier tipo. */
export function Recommended({ items }: { items: ResourceCard[] }) {
  const [main, ...rest] = items;
  if (!main) return null;
  const img = (r: ResourceCard) => r.coverUrl ?? r.iconUrl;
  return (
    <div className={styles.grid}>
      <article className={styles.principal}>
        <div className={styles.imgGrande} data-icono={!main.coverUrl || undefined}>
          {img(main) && <Image src={img(main)!} alt="" fill sizes="(max-width: 960px) 92vw, 620px" />}
          {main.isSample && (
            <span className={styles.ejemplo}>
              <SampleTag />
            </span>
          )}
        </div>
        <div className={styles.texto}>
          <TypeLabel r={main} />
          <h3>
            <Link href={resourceHref(main.type, main.slug)} className={styles.enlace}>
              {main.name}
            </Link>
          </h3>
          <Author r={main} />
          <p className={styles.resumen}>{main.summary}</p>
          {main.type === "mod" ? <Loaders list={main.loaders} /> : <CategoryChips r={main} />}
          <div className={styles.meta}>
            <Versions list={main.mcVersions} />
            <Downloads n={main.downloadCount} />
          </div>
        </div>
      </article>
      <ul className={styles.lista}>
        {rest.map((r) => (
          <li key={r.id}>
            <article className={styles.secundario}>
              <div className={styles.imgChica} data-icono={!r.coverUrl || undefined}>
                {img(r) && <Image src={img(r)!} alt="" fill sizes="180px" />}
              </div>
              <div className={styles.textoChico}>
                <TypeLabel r={r} />
                <h3>
                  <Link href={resourceHref(r.type, r.slug)} className={styles.enlace}>
                    {r.name}
                  </Link>
                </h3>
                <Author r={r} />
                <div className={styles.meta}>
                  <Versions list={r.mcVersions} />
                  <Downloads n={r.downloadCount} />
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
