import { shortDate } from "@/lib/format";
import styles from "./Admin.module.css";

/** Barras de descargas por día. Cada barra lleva su cifra en el título y el total va en el texto alternativo. */
export function Bars({ series, title }: { series: { day: string; n: number }[]; title: string }) {
  const total = series.reduce((a, b) => a + b.n, 0);
  const peak = Math.max(1, ...series.map((s) => s.n));
  return (
    <figure className={styles.grafica}>
      <header>
        <span>{title}</span>
        <span className="num">
          {total} en total · máximo {peak === 1 && total === 0 ? 0 : peak} en un día
        </span>
      </header>
      <div className={styles.barras} role="img" aria-label={`${title}: ${total} en total`}>
        {series.map((s) => (
          <span key={s.day} style={{ height: `${(s.n / peak) * 100}%` }} data-cero={s.n === 0 || undefined} title={`${shortDate(s.day)}: ${s.n}`} />
        ))}
      </div>
      <header>
        <span>{shortDate(series[0]?.day)}</span>
        <span>hoy</span>
      </header>
    </figure>
  );
}
