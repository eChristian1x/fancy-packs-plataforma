import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/panel/Panel.module.css";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/session";
import { compactNumber, fullNumber, relativeDate, shortDate } from "@/lib/format";
import { getCreatorTotals, getDownloadSeries, getMyResources } from "@/lib/queries/panel";
import { resourceHref, TYPE_LABEL } from "@/lib/routes";
import { STATUS_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "Mis publicaciones", robots: { index: false } };


export default async function Page() {
  const user = await requireUser("/panel");
  const [rows, totals, series] = await Promise.all([getMyResources(user.id), getCreatorTotals(user.id), getDownloadSeries(user.id, 30)]);
  const last30 = series.reduce((a, b) => a + b.n, 0);
  const peak = Math.max(1, ...series.map((s) => s.n));

  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <div>
          <h1>Mis publicaciones</h1>
          <p>Lo que subiste, en qué estado está y cuánto se descarga.</p>
        </div>
        <Link href="/publicar" className="boton boton-principal">
          Publicar algo nuevo
        </Link>
      </header>

      <dl className={styles.cifras}>
        <div className={styles.cifra}>
          <dt>Descargas totales</dt>
          <dd className="num" title={fullNumber(totals.downloads)}>{compactNumber(totals.downloads)}</dd>
        </div>
        <div className={styles.cifra}>
          <dt>Últimos 30 días</dt>
          <dd className="num">{compactNumber(last30)}</dd>
        </div>
        <div className={styles.cifra}>
          <dt>Favoritos</dt>
          <dd className="num">{compactNumber(totals.favorites)}</dd>
        </div>
        <div className={styles.cifra}>
          <dt>Seguidores</dt>
          <dd className="num">{compactNumber(totals.followers)}</dd>
        </div>
        <div className={styles.serie}>
          <p>
            <span>Descargas por día</span>
            <span>
              {shortDate(series[0].day)} – hoy
            </span>
          </p>
          <div className={styles.barras} role="img" aria-label={`Descargas de los últimos 30 días: ${last30} en total, máximo ${peak} en un día`}>
            {series.map((s) => (
              <span key={s.day} style={{ height: `${(s.n / peak) * 100}%` }} data-cero={s.n === 0 || undefined} title={`${shortDate(s.day)}: ${s.n}`} />
            ))}
          </div>
        </div>
      </dl>

      {rows.length === 0 ? (
        <EmptyState title="Todavía no publicas nada." body="Empieza con un borrador: nadie lo ve hasta que lo envíes a revisión." action={{ href: "/publicar", label: "Crear mi primera publicación" }} />
      ) : (
        <div className={styles.tablaCaja}>
          <table className={styles.tabla}>
            <caption className="solo-lectores">Tus publicaciones</caption>
            <thead>
              <tr>
                <th scope="col">Publicación</th>
                <th scope="col">Estado</th>
                <th scope="col" className="num">Descargas</th>
                <th scope="col" className="num">30 días</th>
                <th scope="col" className="num">Favoritos</th>
                <th scope="col">Actualizado</th>
                <th scope="col"><span className="solo-lectores">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className={styles.nombre}>
                      {r.coverUrl || r.iconUrl ? <img src={(r.coverUrl ?? r.iconUrl)!} alt="" width={52} height={36} /> : <span className={styles.sinImg} />}
                      <div>
                        <Link href={`/panel/recursos/${r.id}`}>{r.name}</Link>
                        <small>
                          {TYPE_LABEL[r.type].one} · {r.versions === 1 ? "1 versión" : `${r.versions} versiones`}
                          {r.pendingVersions > 0 && r.status === "published" ? ` · ${r.pendingVersions} en revisión` : ""}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.estado} data-s={r.status}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="num">{fullNumber(r.downloadCount)}</td>
                  <td className="num">{fullNumber(r.last30)}</td>
                  <td className="num">{fullNumber(r.favoriteCount)}</td>
                  <td>
                    <time dateTime={r.updatedAt} title={shortDate(r.updatedAt)}>
                      {relativeDate(r.updatedAt)}
                    </time>
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      <Link href={`/panel/recursos/${r.id}`} className="boton boton-secundario boton-chico">
                        Editar
                      </Link>
                      {r.status === "published" && (
                        <Link href={resourceHref(r.type, r.slug)} className="boton boton-secundario boton-chico">
                          Ver
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
