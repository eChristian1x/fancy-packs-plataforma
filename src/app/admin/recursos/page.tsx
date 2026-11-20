import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { setFeatured, setResourceStatus } from "@/lib/actions/admin";
import { fullNumber, relativeDate } from "@/lib/format";
import { listResources } from "@/lib/queries/admin";
import { resourceHref, TYPE_LABEL } from "@/lib/routes";
import { STATUS_LABEL } from "@/lib/status";

export const metadata = { title: "Publicaciones" };

type Props = { searchParams: Promise<{ q?: string; estado?: string; tipo?: string; pagina?: string }> };
const TONE: Record<string, string> = { published: "ok", pending: "warn", rejected: "bad", removed: "bad" };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const status = sp.estado && sp.estado in STATUS_LABEL ? sp.estado : "";
  const type = ["texture", "overlay", "mod"].includes(sp.tipo ?? "") ? sp.tipo! : "";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { rows, total, pages } = await listResources({ q, status, type, page });
  const href = (p: number) => `/admin/recursos?${new URLSearchParams({ ...(q && { q }), ...(status && { estado: status }), ...(type && { tipo: type }), pagina: String(p) })}`;
  return (
    <>
      <header className={styles.titulo}>
        <h1>Publicaciones</h1>
        <p>{fullNumber(total)} en total</p>
      </header>
      <form className={styles.filtros} action="/admin/recursos">
        <input type="search" name="q" defaultValue={q} placeholder="Nombre o usuario" aria-label="Buscar" />
        <select name="estado" defaultValue={status} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="tipo" defaultValue={type} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          <option value="texture">Texturas</option>
          <option value="overlay">Overlays</option>
          <option value="mod">Mods</option>
        </select>
        <button type="submit" className={styles.btn}>Filtrar</button>
      </form>
      <div className={styles.tablaCaja}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Publicación</th>
              <th>Estado</th>
              <th className="num">Descargas</th>
              <th>Actualizado</th>
              <th><span className="solo-lectores">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.status === "published" ? <Link href={resourceHref(r.type, r.slug)}>{r.name}</Link> : <Link href={`/panel/recursos/${r.id}`}>{r.name}</Link>}
                  <span className={styles.sub}>
                    {TYPE_LABEL[r.type].one} · @{r.owner}
                    {r.isSample ? " · ejemplo" : ""}
                    {r.reports > 0 ? ` · ${r.reports} reportes abiertos` : ""}
                  </span>
                </td>
                <td>
                  <span className={styles.chip} data-t={TONE[r.status]}>{STATUS_LABEL[r.status]}</span>
                  {r.featured && <span className={styles.chip} data-t="warn" style={{ marginLeft: 6 }}>Destacado</span>}
                </td>
                <td className="num">{fullNumber(r.downloadCount)}</td>
                <td>{relativeDate(r.updatedAt)}</td>
                <td>
                  <div className={styles.botones}>
                    {r.status === "published" && <ActionButton action={setFeatured.bind(null, r.id, !r.featured)} label={r.featured ? "Quitar destacado" : "Destacar"} />}
                    {r.status === "published" && <ActionButton action={setResourceStatus.bind(null, r.id, "removed", "Retirado por un administrador.")} label="Retirar" tone="peligro" confirm="¿Retirar del catálogo?" />}
                    {r.status === "removed" && <ActionButton action={setResourceStatus.bind(null, r.id, "published", undefined)} label="Volver a publicar" />}
                    <Link href={`/panel/recursos/${r.id}`} className={styles.btn}>Editar</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <p className={styles.paginas}>
          {page > 1 && <Link href={href(page - 1)}>Anterior</Link>}
          <span>Página {page} de {pages}</span>
          {page < pages && <Link href={href(page + 1)}>Siguiente</Link>}
        </p>
      )}
    </>
  );
}
