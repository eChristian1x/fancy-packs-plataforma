import type { Metadata } from "next";
import styles from "@/components/content/Prose.module.css";

export const metadata: Metadata = {
  title: "Reglas de publicación",
  description: "Qué se puede publicar en Fancy Packs y cómo se revisa.",
};

// Reglas del sitio anterior (README), adaptadas a la plataforma con cuentas.
export default function Page() {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <h1>Reglas de publicación</h1>
        <p>Fancy Packs solo publica trabajo de sus creadores o con su permiso.</p>
      </header>
      <div className={styles.bloques}>
        <section className={styles.bloque}>
          <h2>Qué se puede publicar</h2>
          <ul>
            <li>Packs, overlays y mods que hiciste tú.</li>
            <li>
              Trabajo de otra persona solo si te dio permiso. Escribe cómo te lo dio: se muestra en la página del pack.
            </li>
            <li>El crédito siempre va al creador original, con su nombre.</li>
          </ul>
        </section>
        <section className={styles.bloque}>
          <h2>Cómo se revisa</h2>
          <ul>
            <li>
              Cada <code>.zip</code> se abre antes de publicarse: tiene que ser un resource pack de Java con <code>pack.mcmeta</code>.
            </li>
            <li>Los packs de Bedrock (.mcpack) no se aceptan por ahora.</li>
            <li>De cada archivo se guarda su SHA-1 y SHA-512, para que el mod compruebe que no cambió.</li>
          </ul>
        </section>
        <section className={styles.bloque}>
          <h2>Si eres creador</h2>
          <ul>
            <li>Si alguien publicó tu pack sin permiso, repórtalo desde su página y lo quitamos.</li>
            <li>Si quieres que agreguemos o quitemos un pack tuyo, escríbenos por el contacto del pie de página.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
