import { compactNumber, fullNumber } from "@/lib/format";
import type { PlatformStats } from "@/lib/queries/resources";
import styles from "./Stats.module.css";

/** Cifras reales de la base de datos. Si hay contenido de ejemplo, se dice al lado. */
export function Stats({ stats }: { stats: PlatformStats }) {
  const items = [
    { n: stats.textures, label: stats.textures === 1 ? "textura" : "texturas" },
    { n: stats.mods, label: stats.mods === 1 ? "mod" : "mods" },
    { n: stats.downloads, label: "descargas", compact: true },
    { n: stats.creators, label: stats.creators === 1 ? "creador" : "creadores" },
  ];
  return (
    <section className={`contenedor ${styles.stats}`} aria-label="Fancy Packs en cifras">
      <dl>
        {items.map((it) => (
          <div key={it.label}>
            <dt className="solo-lectores">{it.label}</dt>
            <dd>
              <b className="num" title={fullNumber(it.n)}>
                {it.compact ? compactNumber(it.n) : fullNumber(it.n)}
              </b>
              <span aria-hidden="true">{it.label}</span>
            </dd>
          </div>
        ))}
      </dl>
      {stats.hasSamples && <p className={styles.nota}>Cifras de ejemplo</p>}
    </section>
  );
}
