"use client";

import { useEffect } from "react";
import styles from "@/components/content/Prose.module.css";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className={`contenedor ${styles.pagina}`} role="alert">
      <header className={styles.cabeza}>
        <h1>Esta página no cargó.</h1>
        <p>El servidor no pudo leer los datos. Vuelve a intentarlo; si sigue pasando, prueba en unos minutos.</p>
      </header>
      <button type="button" className="boton boton-principal" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}
