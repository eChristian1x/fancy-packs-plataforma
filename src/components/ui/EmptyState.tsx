import Link from "next/link";
import styles from "./EmptyState.module.css";

/** Estado vacío o de error: dice qué pasó y qué hacer. */
export function EmptyState({
  title,
  body,
  action,
  tone = "vacio",
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
  tone?: "vacio" | "error";
}) {
  return (
    <div className={styles.vacio} data-tone={tone} role={tone === "error" ? "alert" : undefined}>
      <p className={styles.titulo}>{title}</p>
      {body && <p>{body}</p>}
      {action && (
        <Link href={action.href} className="boton boton-secundario boton-chico">
          {action.label}
        </Link>
      )}
    </div>
  );
}
