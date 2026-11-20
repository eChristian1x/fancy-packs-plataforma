import Link from "next/link";
import { Loaders } from "@/components/cards/parts";
import { fullNumber, shortDate } from "@/lib/format";
import type { ResourceDetail } from "@/lib/queries/detail";
import { resourceHref } from "@/lib/routes";
import { versionRange } from "@/lib/versions";
import { CopyButton } from "./CopyButton";
import { RichText } from "./RichText";
import styles from "./Versions.module.css";

const bytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const KIND: Record<string, string> = { required: "Necesario", optional: "Opcional", incompatible: "Incompatible", embedded: "Incluido" };
const CHANNEL: Record<string, string> = { release: "Estable", beta: "Beta", alpha: "Alfa" };

/** Historial de versiones de un mod: cada una con sus archivos, dependencias y cambios. */
export function Versions({ r }: { r: ResourceDetail }) {
  if (!r.versions.length) return null;
  return (
    <section aria-labelledby="versiones" className={styles.seccion}>
      <h2 id="versiones" className={styles.h2}>
        Versiones <span className="num">{r.versions.length}</span>
      </h2>
      <ol className={styles.lista}>
        {r.versions.map((v, i) => (
          <li key={v.id}>
            <details className={styles.version} open={i === 0}>
              <summary>
                <span className={styles.numero}>
                  <b className="num">{v.versionNumber}</b>
                  {v.channel !== "release" && <span className="chip chip-miel">{CHANNEL[v.channel] ?? v.channel}</span>}
                  {i === 0 && <span className="chip chip-fresa">Última</span>}
                </span>
                <span className={styles.mc}>Minecraft {versionRange(v.mcVersions)}</span>
                <Loaders list={v.loaders} />
                <time dateTime={v.publishedAt ?? undefined} className={styles.fecha}>
                  {shortDate(v.publishedAt)}
                </time>
              </summary>
              <div className={styles.detalle}>
                {v.title && <p className={styles.titulo}>{v.title}</p>}
                {v.changelog ? <RichText text={v.changelog} /> : <p className={styles.tenue}>Sin notas de cambios.</p>}

                {v.dependencies.length > 0 && (
                  <div>
                    <h3 className={styles.h3}>Dependencias</h3>
                    <ul className={styles.deps}>
                      {v.dependencies.map((d) => (
                        <li key={d.name + d.kind}>
                          <span className={`${styles.tipo} ${styles[d.kind] ?? ""}`}>{KIND[d.kind] ?? d.kind}</span>
                          {d.slug && d.type ? (
                            <Link href={resourceHref(d.type, d.slug)}>{d.name}</Link>
                          ) : d.url ? (
                            <a href={d.url} rel="nofollow noopener" target="_blank">
                              {d.name}
                            </a>
                          ) : (
                            <span>{d.name}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className={styles.h3}>Archivos</h3>
                  {v.files.length ? (
                    <ul className={styles.archivos}>
                      {v.files.map((f) => (
                        <li key={f.id}>
                          <span className={styles.nombreArchivo}>{f.fileName}</span>
                          <span className="num">{bytes(f.sizeBytes)}</span>
                          <span className={styles.sha}>
                            <code title={`SHA-1 ${f.sha1}`}>{f.sha1.slice(0, 8)}</code>
                            <CopyButton value={f.sha1} label="Copiar SHA-1" className={styles.copiar} />
                          </span>
                          <a className="boton boton-secundario boton-chico" href={`/descargar/${encodeURIComponent(r.slug)}?archivo=${f.id}`} download={f.fileName}>
                            Descargar
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.tenue}>Esta versión no tiene archivos.</p>
                  )}
                  <p className={styles.tenue}>{fullNumber(v.downloadCount)} descargas de esta versión</p>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
