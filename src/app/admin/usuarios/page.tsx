import Link from "next/link";
import { ActionButton, RoleSelect } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { setBanned, setRole, setVerified } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth/session";
import { fullNumber, shortDate } from "@/lib/format";
import { listUsers } from "@/lib/queries/admin";
import { creatorHref } from "@/lib/routes";

export const metadata = { title: "Usuarios" };

type Props = { searchParams: Promise<{ q?: string; ver?: string; pagina?: string }> };
const ROLE: Record<string, string> = { user: "Usuario", creator: "Creador", moderator: "Moderador", admin: "Administrador" };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 48);
  const filter = ["suspendidos", "equipo", "verificados", "ejemplo"].includes(sp.ver ?? "") ? sp.ver! : "";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const [{ rows, total, pages }, me] = await Promise.all([listUsers({ q, filter, page }), getSessionUser()]);
  const href = (p: number) => `/admin/usuarios?${new URLSearchParams({ ...(q && { q }), ...(filter && { ver: filter }), pagina: String(p) })}`;
  return (
    <>
      <header className={styles.titulo}>
        <h1>Usuarios</h1>
        <p>{fullNumber(total)} cuentas</p>
      </header>
      <form className={styles.filtros} action="/admin/usuarios">
        <input type="search" name="q" defaultValue={q} placeholder="Usuario o nombre" aria-label="Buscar" />
        <select name="ver" defaultValue={filter} aria-label="Mostrar">
          <option value="">Todos</option>
          <option value="verificados">Creadores verificados</option>
          <option value="equipo">Equipo</option>
          <option value="suspendidos">Suspendidos</option>
          <option value="ejemplo">De ejemplo</option>
        </select>
        <button type="submit" className={styles.btn}>Filtrar</button>
      </form>
      <div className={styles.tablaCaja}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th className="num">Publicaciones</th>
              <th className="num">Comentarios</th>
              <th>Desde</th>
              <th>Rol</th>
              <th><span className="solo-lectores">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Avatar seed={u.username} src={u.avatarUrl} size={32} />
                    <span>
                      <Link href={creatorHref(u.username)}>{u.displayName}</Link>
                      <span className={styles.sub}>
                        @{u.username}
                        {u.isVerified ? " · verificado" : ""}
                        {u.isBanned ? " · suspendido" : ""}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="num">{u.resources}</td>
                <td className="num">{u.comments}</td>
                <td>{shortDate(u.createdAt)}</td>
                <td>{me?.role === "admin" && u.id !== me.id ? <RoleSelect action={setRole.bind(null, u.id)} value={u.role} /> : ROLE[u.role]}</td>
                <td>
                  <div className={styles.botones}>
                    <ActionButton action={setVerified.bind(null, u.id, !u.isVerified)} label={u.isVerified ? "Quitar verificado" : "Verificar"} />
                    {u.id !== me?.id &&
                      (u.isBanned ? (
                        <ActionButton action={setBanned.bind(null, u.id, false)} label="Quitar suspensión" />
                      ) : (
                        <ActionButton action={setBanned.bind(null, u.id, true)} label="Suspender" tone="peligro" confirm="¿Suspender? Se retiran sus publicaciones y comentarios." />
                      ))}
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
