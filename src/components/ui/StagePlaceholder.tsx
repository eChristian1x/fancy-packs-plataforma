import Link from "next/link";
import styles from "./StagePlaceholder.module.css";

/**
 * Página de una sección que se construye en una etapa posterior.
 * No simula nada: dice qué va a tener y cuándo.
 */
export function StagePlaceholder({
  stage,
  title,
  description,
  items,
}: {
  stage: number;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className={`contenedor ${styles.pagina}`} aria-labelledby="titulo">
      <p className={styles.etapa}>Etapa {stage} de 9</p>
      <h1 id="titulo">{title}</h1>
      <p className={styles.desc}>{description}</p>
      <ul className={styles.lista}>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <Link href="/" className="boton boton-secundario">
        Volver al inicio
      </Link>
    </section>
  );
}
