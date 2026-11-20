import styles from "./Stars.module.css";

/** Estrellas de valoración (solo lectura). */
export function Stars({ value, count, size = 16 }: { value: number; count?: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={styles.estrellas} title={`${value.toFixed(1)} de 5`}>
      <span className={styles.fondo} style={{ fontSize: size }} aria-hidden="true">
        ★★★★★
        <span className={styles.lleno} style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      <span className="solo-lectores">{value.toFixed(1)} de 5 estrellas</span>
      {count != null && <span className={`${styles.n} num`}>{count === 1 ? "1 valoración" : `${count} valoraciones`}</span>}
    </span>
  );
}
