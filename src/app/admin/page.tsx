import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { Bars } from "@/components/admin/Bars";
import { clearSamples, loadSampleAssets } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth/session";
import { compactNumber, fullNumber } from "@/lib/format";
import { getOverview } from "@/lib/queries/admin";
import { getStats } from "@/lib/queries/resources";
import { resourceHref, TYPE_LABEL } from "@/lib/routes";

export const metadata = { title: "Resumen" };

const SOURCE: Record<string, string> = { web: "Sitio web", mod: "Mod Fancy Packs", api: "API" };

export default async function Page() {
  const [o, me, stats] = await Promise.all([getOverview(), getSessionUser(), getStats().catch(() => null)]);
  const s = o.status;
  const samples = !!stats?.hasSamples;
  return (
    <>
      <header className={styles.titulo}>
        <h1>Resumen</h1>
        <p>Cifras reales de la base de datos. Las descargas no cuentan bots ni repeticiones de la misma IP en 24 horas.</p>
      </header>
      <dl className={styles.cifras}>
        <div>
          <dt>Por revisar</dt>
          <dd className="num"><Link href="/admin/pendientes">{(s.pending ?? 0) + o.pendingVersions}</Link></dd>
        </div>
        <div>
          <dt>Reportes abiertos</dt>
          <dd className="num"><Link href="/admin/reportes">{o.openReports}</Link></dd>
        </div>
        <div>
          <dt>Publicadas</dt>
          <dd className="num">{fullNumber(s.published ?? 0)}</dd>
        </div>
        <div>
          <dt>Borradores</dt>
          <dd className="num">{fullNumber(s.draft ?? 0)}</dd>
        </div>
        <div>
          <dt>Usuarios</dt>
          <dd className="num">{fullNumber(o.users.total)}</dd>
        </div>
        <div>
          <dt>Nuevos (7 días)</dt>
          <dd className="num">{fullNumber(o.users.week)}</dd>
        </div>
        <div>
          <dt>Descargas hoy</dt>
          <dd className="num">{compactNumber(o.downloads.today)}</dd>
        </div>
        <div>
          <dt>Descargas 30 días</dt>
          <dd className="num">{compactNumber(o.downloads.month)}</dd>
        </div>
      </dl>
      <Bars series={o.series} title="Descargas por día, últimos 30 días" />
      <div className={styles.dos}>
        <section>
          <h2 className={styles.h2}>Más descargados esta semana</h2>
          {o.top.length ? (
            <div className={styles.tablaCaja}>
              <table className={styles.tabla}>
                <thead>
                  <tr><th>Publicación</th><th className="num">Descargas</th></tr>
                </thead>
                <tbody>
                  {o.top.map((t) => (
                    <tr key={t.id}>
                      <td><Link href={resourceHref(t.type, t.slug)}>{t.name}</Link><span className={styles.sub}>{TYPE_LABEL[t.type].one}</span></td>
                      <td className="num">{fullNumber(t.n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.sub}>Todavía no hay descargas registradas esta semana.</p>
          )}
        </section>
        <section>
          <h2 className={styles.h2}>De dónde vienen (30 días)</h2>
          {o.sources.length ? (
            <div className={styles.tablaCaja}>
              <table className={styles.tabla}>
                <tbody>
                  {o.sources.map((x) => (
                    <tr key={x.source}><td>{SOURCE[x.source] ?? x.source}</td><td className="num">{fullNumber(x.n)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.sub}>Sin datos todavía.</p>
          )}
        </section>
      </div>
      {me?.role === "admin" && samples && (
        <section className={styles.grafica}>
          <h2 className={styles.h2}>Contenido de ejemplo</h2>
          <p className={styles.sub}>
            Los packs y creadores marcados como “Ejemplo” sirven para ver el sitio con contenido. Cárgales galerías y archivos de prueba, o bórralos cuando publiques lo real.
          </p>
          <div className={styles.botones}>
            <ActionButton action={loadSampleAssets} label="Cargar galerías y archivos de ejemplo" pending="Cargando…" />
            <ActionButton action={clearSamples} label="Borrar todo el contenido de ejemplo" tone="peligro" confirm="¿Borrar packs y creadores de ejemplo? No se puede deshacer." />
          </div>
        </section>
      )}
    </>
  );
}
