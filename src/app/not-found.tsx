import Link from "next/link";
import styles from "@/components/content/Prose.module.css";

export default function NotFound() {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <h1>No encontramos esa página.</h1>
        <p>Puede que el pack se haya quitado o que la dirección esté mal escrita.</p>
      </header>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/" className="boton boton-principal">
          Ir al inicio
        </Link>
        <Link href="/texturas" className="boton boton-secundario">
          Explorar texturas
        </Link>
      </div>
    </div>
  );
}
