import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { EmptyState } from "@/components/ui/EmptyState";
import { resolveReport } from "@/lib/actions/admin";
import { relativeDate } from "@/lib/format";
import { listReports } from "@/lib/queries/admin";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";
import { resourceHref } from "@/lib/routes";

export const metadata = { title: "Reportes" };

type Props = { searchParams: Promise<{ ver?: string }> };

export default async function Page({ searchParams }: Props) {
  const ver = (await searchParams).ver;
  const status = ver === "cerrados" ? "resolved" : ver === "descartados" ? "dismissed" : "open";
  const rows = await listReports(status);
  return (
    <>
      <header className={styles.titulo}>
        <h1>Reportes</h1>
        <p className={styles.filtros}>
          <Link href="/admin/reportes" className={styles.btn} data-tone={status === "open" ? "principal" : undefined}>Abiertos</Link>
          <Link href="/admin/reportes?ver=cerrados" className={styles.btn} data-tone={status === "resolved" ? "principal" : undefined}>Con contenido retirado</Link>
          <Link href="/admin/reportes?ver=descartados" className={styles.btn} data-tone={status === "dismissed" ? "principal" : undefined}>Descartados</Link>
        </p>
      </header>
      {rows.length === 0 ? (
        <EmptyState title={status === "open" ? "No hay reportes abiertos." : "Nada por aquí."} />
      ) : (
        <div className={styles.tablaCaja}>
          <table className={styles.tabla}>
            <thead>
              <tr><th>Sobre</th><th>Motivo</th><th>Quién</th><th><span className="solo-lectores">Acciones</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.resource ? (
                      <Link href={r.resource.status === "published" ? resourceHref(r.resource.type, r.resource.slug) : `/panel/recursos/${r.targetId}`}>{r.resource.name}</Link>
                    ) : r.comment ? (
                      <span>Comentario: “{r.comment.body.slice(0, 80)}”</span>
                    ) : (
                      <span className={styles.sub}>Ya no existe</span>
                    )}
                    <span className={styles.sub}>{relativeDate(r.createdAt)}</span>
                  </td>
                  <td>
                    {REPORT_REASONS[r.reason as ReportReason] ?? r.reason}
                    {r.details && <span className={styles.sub}>{r.details}</span>}
                  </td>
                  <td>{r.reporter ? `@${r.reporter}` : "Visitante"}</td>
                  <td>
                    {status === "open" && (
                      <div className={styles.botones}>
                        <ActionButton action={resolveReport.bind(null, r.id, "remove")} label="Retirar contenido" tone="peligro" confirm="¿Retirar?" />
                        <ActionButton action={resolveReport.bind(null, r.id, "dismiss")} label="Descartar" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
