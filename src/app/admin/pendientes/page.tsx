import Link from "next/link";
import { ActionButton, RejectButton } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { EmptyState } from "@/components/ui/EmptyState";
import { approveResource, approveVersion, rejectResource, rejectVersion } from "@/lib/actions/admin";
import { relativeDate } from "@/lib/format";
import { getPending } from "@/lib/queries/admin";
import { creatorHref, resourceHref, TYPE_LABEL } from "@/lib/routes";
import { fileUrl } from "@/lib/storage";

export const metadata = { title: "Por revisar" };

const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default async function Page() {
  const { items, versions } = await getPending();
  return (
    <>
      <header className={styles.titulo}>
        <h1>Por revisar</h1>
        <p>Revisa que sea contenido propio o con permiso, que las capturas correspondan y que el archivo sea lo que dice.</p>
      </header>
      <section aria-labelledby="pub">
        <h2 id="pub" className={styles.h2}>Publicaciones nuevas ({items.length})</h2>
        {items.length === 0 ? (
          <EmptyState title="No hay publicaciones esperando revisión." />
        ) : (
          <ul style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {items.map((r) => (
              <li key={r.id} className={styles.tarjeta}>
                {r.coverUrl ? <img src={r.coverUrl} alt="" /> : <span />}
                <div className={styles.tarjetaCuerpo}>
                  <h3>{r.name}</h3>
                  <p>{r.summary}</p>
                  <div className={styles.datos}>
                    <span>{TYPE_LABEL[r.type].one}</span>
                    <span>
                      por <Link href={creatorHref(r.owner)}>@{r.owner}</Link>
                      {r.ownerVerified ? " (verificado)" : ""}
                    </span>
                    <span>crédito: {r.authorName}</span>
                    {r.categories.length > 0 && <span>{r.categories.join(", ")}</span>}
                    <span>enviado {relativeDate(r.updatedAt)}</span>
                  </div>
                  {r.permissionNote && <p className={styles.permiso}>Permiso del autor: {r.permissionNote}</p>}
                  <div className={styles.datos}>
                    {r.files.map((f) => (
                      <a key={f.storagePath} href={fileUrl(f.storagePath)} download>
                        {f.fileName} ({size(f.sizeBytes)}, v{f.number}, MC {f.mc.join(", ")})
                      </a>
                    ))}
                  </div>
                  <div className={styles.botones}>
                    <ActionButton action={approveResource.bind(null, r.id)} label="Aprobar y publicar" tone="principal" pending="Publicando…" />
                    <RejectButton action={rejectResource.bind(null, r.id)} />
                    <Link href={`/panel/recursos/${r.id}`} className={styles.btn}>
                      Ver todo en el editor
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="ver">
        <h2 id="ver" className={styles.h2}>Versiones nuevas de publicaciones aprobadas ({versions.length})</h2>
        {versions.length === 0 ? (
          <EmptyState title="No hay versiones esperando revisión." body="Las de creadores verificados se publican solas." />
        ) : (
          <div className={styles.tablaCaja} style={{ marginTop: 12 }}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Publicación</th>
                  <th>Versión</th>
                  <th>Archivo</th>
                  <th><span className="solo-lectores">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.versionId}>
                    <td>
                      <Link href={resourceHref(v.type, v.slug)}>{v.name}</Link>
                      <span className={styles.sub}>@{v.owner} · {relativeDate(v.createdAt)}</span>
                    </td>
                    <td>
                      {v.versionNumber}
                      <span className={styles.sub}>MC {v.mcVersions.join(", ")}</span>
                      {v.changelog && <span className={styles.sub}>{v.changelog.slice(0, 140)}</span>}
                    </td>
                    <td>
                      {v.files.map((f) => (
                        <a key={f.storagePath} href={fileUrl(f.storagePath)} download>
                          {f.fileName} ({size(f.sizeBytes)})
                        </a>
                      ))}
                    </td>
                    <td>
                      <div className={styles.botones}>
                        <ActionButton action={approveVersion.bind(null, v.versionId)} label="Publicar" tone="principal" />
                        <ActionButton action={rejectVersion.bind(null, v.versionId)} label="Descartar" tone="peligro" confirm="¿Descartar esta versión?" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
