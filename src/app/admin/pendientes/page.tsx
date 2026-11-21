import Link from "next/link";
import { ActionButton, RejectButton } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { EmptyState } from "@/components/ui/EmptyState";
import { approveResource, approveVersion, rejectResource, rejectVersion } from "@/lib/actions/admin";
import { relativeDate } from "@/lib/format";
import { getPending } from "@/lib/queries/admin";
import { getMyResources } from "@/lib/queries/panel";
import { getSessionUser } from "@/lib/auth/session";
import { checklistFor } from "@/lib/publishing";
import { creatorHref, resourceHref, TYPE_LABEL } from "@/lib/routes";
import { fileUrl } from "@/lib/storage";

export const metadata = { title: "Por revisar" };

const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

export default async function Page() {
  const [{ items, versions }, me] = await Promise.all([getPending(), getSessionUser()]);
  // Lo que sube un admin no pasa por esta cola: se publica desde su editor. Se lista aquí para no perderlo.
  const mine = me ? (await getMyResources(me.id)).filter((r) => r.status === "draft" || r.status === "rejected") : [];
  const missing = await Promise.all(mine.map(async (r) => (await checklistFor(r.id)).filter((c) => !c.done).map((c) => c.label.toLowerCase())));
  return (
    <>
      <header className={styles.titulo}>
        <h1>Por revisar</h1>
        <p>Revisa que sea contenido propio o con permiso, que las capturas correspondan y que el archivo sea lo que dice.</p>
      </header>
      {mine.length > 0 && (
        <section aria-labelledby="mios">
          <h2 id="mios" className={styles.h2}>Tus borradores ({mine.length})</h2>
          <p className={styles.sub}>Lo que subes tú no necesita aprobación: termínalo y presiona «Publicar» en su editor.</p>
          <ul style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {mine.map((r, i) => (
              <li key={r.id} className={styles.tarjeta}>
                {r.coverUrl ? <img src={r.coverUrl} alt="" /> : <span />}
                <div className={styles.tarjetaCuerpo}>
                  <h3>{r.name}</h3>
                  <div className={styles.datos}>
                    <span>{TYPE_LABEL[r.type].one}</span>
                    <span>{r.versions} {r.versions === 1 ? "versión" : "versiones"}</span>
                    <span>editado {relativeDate(r.updatedAt)}</span>
                  </div>
                  <p>{missing[i].length ? `Falta: ${missing[i].join(", ")}.` : "Listo para publicar."}</p>
                  <div className={styles.botones}>
                    <Link href={`/panel/recursos/${r.id}`} className={styles.btn} data-tone="principal">
                      {missing[i].length ? "Terminar y publicar" : "Abrir y publicar"}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
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
