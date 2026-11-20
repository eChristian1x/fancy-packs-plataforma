import styles from "./SampleNotice.module.css";

/** Aviso fijo mientras haya contenido de ejemplo en la base de datos. */
export function SampleNotice() {
  return (
    <aside className={styles.aviso} aria-label="Aviso de contenido de ejemplo">
      <div className="contenedor">
        <b>Contenido de ejemplo.</b> Los packs, creadores y cifras que ves son de prueba. Se quitan cuando se publiquen los
        primeros recursos reales.
      </div>
    </aside>
  );
}
