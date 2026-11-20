import Link from "next/link";
import styles from "@/components/admin/Admin.module.css";
import { Bars } from "@/components/admin/Bars";
import { fullNumber } from "@/lib/format";
import { getDownloadStats } from "@/lib/queries/admin";
import { resourceHref, TYPE_LABEL } from "@/lib/routes";

export const metadata = { title: "Descargas" };

type Props = { searchParams: Promise<{ dias?: string }> };
const SOURCE: Record<string, string> = { web: "Sitio", mod: "Mod", api: "API" };

export default async function Page({ searchParams }: Props) {
  const d = Number((await searchParams).dias);
  const days = [7, 30, 90].includes(d) ? d : 30;
  const s = await getDownloadStats(days);
  return (
    <>
      <header className={styles.titulo}>
        <h1>Descargas</h1>
        <p className={styles.filtros}>
          {[7, 30, 90].map((n) => (
            <Link key={n} href={`/admin/descargas?dias=${n}`} className={styles.btn} data-tone={n === days ? "principal" : undefined}>
              {n} días
            </Link>
          ))}
        </p>
      </header>
      <Bars series={s.series} title={`Descargas por día, últimos ${days} días`} />
      <div className={styles.dos}>
        <section>
          <h2 className={styles.h2}>Por tipo y origen</h2>
          <div className={styles.tablaCaja}>
            <table className={styles.tabla}>
              <thead><tr><th>Tipo</th><th>Origen</th><th className="num">Descargas</th></tr></thead>
              <tbody>
                {s.byType.map((x) => (
                  <tr key={x.type + x.source}><td>{TYPE_LABEL[x.type].many}</td><td>{SOURCE[x.source] ?? x.source}</td><td className="num">{fullNumber(x.n)}</td></tr>
                ))}
                {!s.byType.length && <tr><td colSpan={3}>Sin descargas en este periodo.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className={styles.h2}>Versiones de Minecraft</h2>
          <div className={styles.tablaCaja}>
            <table className={styles.tabla}>
              <thead><tr><th>Versión</th><th className="num">Descargas</th></tr></thead>
              <tbody>
                {s.byVersion.map((x) => (
                  <tr key={x.v}><td>{x.v}</td><td className="num">{fullNumber(x.n)}</td></tr>
                ))}
                {!s.byVersion.length && <tr><td colSpan={2}>Sin datos.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section>
        <h2 className={styles.h2}>Más descargados</h2>
        <div className={styles.tablaCaja}>
          <table className={styles.tabla}>
            <thead><tr><th>Publicación</th><th className="num">Descargas</th></tr></thead>
            <tbody>
              {s.top.map((x) => (
                <tr key={x.slug}><td><Link href={resourceHref(x.type, x.slug)}>{x.name}</Link><span className={styles.sub}>{TYPE_LABEL[x.type].one}</span></td><td className="num">{fullNumber(x.n)}</td></tr>
              ))}
              {!s.top.length && <tr><td colSpan={2}>Sin descargas en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
