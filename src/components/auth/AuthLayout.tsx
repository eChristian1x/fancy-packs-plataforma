import Link from "next/link";
import { DEV_MODE } from "@/lib/dev";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import styles from "./Auth.module.css";

/** Marco de las páginas de cuenta: el formulario a la izquierda y para qué sirve la cuenta a la derecha. */
export function AuthLayout({ title, intro, children, aside = true }: { title: string; intro?: React.ReactNode; children: React.ReactNode; aside?: boolean }) {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <div className={styles.columna}>
        <h1 className={styles.titulo}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        {!AUTH_ENABLED && !DEV_MODE && (
          <p className={styles.apagado} role="status">
            Las cuentas todavía no están activadas en este sitio. Puedes descargar todo sin cuenta.
          </p>
        )}
        {children}
      </div>
      {aside && (
        <aside className={styles.lado} aria-label="Qué puedes hacer con una cuenta">
          <h2>Con una cuenta puedes</h2>
          <ul>
            <li>
              <b>Guardar favoritos</b> y volver a ellos desde cualquier dispositivo.
            </li>
            <li>
              <b>Ver tu historial</b> de descargas para reinstalar tu pack de siempre.
            </li>
            <li>
              <b>Seguir creadores</b> y enterarte cuando suben algo nuevo.
            </li>
            <li>
              <b>Comentar y valorar</b> packs y mods.
            </li>
            <li>
              <b>Publicar</b> tus propias texturas, overlays y mods.
            </li>
          </ul>
          <p>
            Descargar no necesita cuenta. <Link href="/reglas">Reglas de publicación</Link>
          </p>
        </aside>
      )}
    </div>
  );
}
