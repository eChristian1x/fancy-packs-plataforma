import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { relativeDate, shortDate } from "@/lib/format";
import type { ResourceDetail } from "@/lib/queries/detail";
import { creatorHref, resourceHref } from "@/lib/routes";
import { CommentForm, DeleteComment } from "./CommentForm";
import type { Viewer } from "./ResourcePage";
import styles from "./Comments.module.css";

export function Comments({ r, viewer }: { r: ResourceDetail; viewer: Viewer }) {
  const path = resourceHref(r.type, r.slug);
  return (
    <section aria-labelledby="comentarios" className={styles.seccion}>
      <h2 id="comentarios" className={styles.h2}>
        Comentarios <span className="num">{r.comments.length}</span>
      </h2>
      {viewer ? (
        viewer.isBanned ? (
          <p className={styles.tenue}>Tu cuenta está suspendida y no puede comentar.</p>
        ) : (
          <CommentForm resourceId={r.id} />
        )
      ) : (
        <p className={styles.entrar}>
          <Link href={`/entrar?siguiente=${encodeURIComponent(path + "#comentarios")}`}>Inicia sesión</Link> para dejar un comentario.
        </p>
      )}
      {r.comments.length === 0 ? (
        <p className={styles.tenue}>Nadie ha comentado todavía.</p>
      ) : (
        <ol className={styles.lista}>
          {r.comments.map((c) => (
            <li key={c.id} className={styles.comentario}>
              <Avatar seed={c.username} src={c.avatarUrl} size={36} />
              <div className={styles.cuerpo}>
                <p className={styles.meta}>
                  <Link href={creatorHref(c.username)} className={styles.nombre}>
                    {c.displayName}
                  </Link>
                  {c.username === r.owner.username && <span className="chip chip-fresa">Autor</span>}
                  {c.score != null && (
                    <span className={styles.nota} aria-label={`Valoró con ${c.score} de 5`}>
                      {"★".repeat(c.score)}
                      <span className={styles.notaVacia}>{"★".repeat(5 - c.score)}</span>
                    </span>
                  )}
                  <time dateTime={c.createdAt} title={shortDate(c.createdAt)}>
                    {relativeDate(c.createdAt)}
                  </time>
                </p>
                <p className={styles.texto}>{c.body}</p>
                {viewer && (viewer.id === c.userId || viewer.staff) && <DeleteComment id={c.id} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
