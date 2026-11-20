import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/content/Prose.module.css";

export const metadata: Metadata = {
  title: "Cómo instalar un pack",
  description: "Instala texturas y overlays en Minecraft Java a mano o sin reiniciar con el mod Fancy Packs · Texturas.",
};

// Contenido de la sección "Tutoriales" del sitio anterior.
export default function Page() {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <h1>Cómo instalar un pack</h1>
        <p>Dos formas: a mano desde el menú del juego, o sin reiniciar con el mod de Fancy Packs.</p>
      </header>
      <div className={styles.bloques}>
        <section className={styles.bloque}>
          <h2>A mano</h2>
          <ol>
            <li>
              <span>
                Pulsa <b>Descargar</b> en el pack que quieras. Se baja un archivo <code>.zip</code>. <b>No lo descomprimas.</b>
              </span>
            </li>
            <li>
              <span>
                Abre Minecraft y entra a <b>Opciones → Paquetes de recursos</b>.
              </span>
            </li>
            <li>
              <span>
                Pulsa <b>Abrir carpeta de paquetes</b> y mueve ahí el <code>.zip</code>.
              </span>
            </li>
            <li>
              <span>
                Vuelve al juego, pasa el pack a la columna de la derecha y pulsa <b>Listo</b>.
              </span>
            </li>
          </ol>
        </section>
        <section className={styles.bloque}>
          <h2>Sin reiniciar, con el mod</h2>
          <ol>
            <li>
              <span>
                Instala <b>Fabric</b> para tu versión y pon <b>Fabric API</b> y el mod <b>Fancy Packs · Texturas</b> en tu carpeta{" "}
                <code>mods</code>.
              </span>
            </li>
            <li>
              <span>
                En el juego ve a <b>Opciones → Paquetes de recursos</b> y pulsa <b>Fancy Packs</b> (o la tecla <b>J</b> dentro de un mundo).
              </span>
            </li>
            <li>
              <span>
                Arriba elige <b>Fancy</b>. La primera vez pega la dirección de esta página.
              </span>
            </li>
            <li>
              <span>
                Pulsa <b>Instalar</b> en cualquier pack: se descarga, se revisa y se activa al momento.
              </span>
            </li>
          </ol>
        </section>
        <section className={styles.bloque}>
          <h2>¿Se ve raro o no aparece?</h2>
          <ul>
            <li>Revisa que el pack sea para tu versión. Cada tarjeta dice las versiones compatibles.</li>
            <li>
              Si el juego dice <b>incompatible</b>, igual puedes activarlo, pero algunas texturas pueden no cargar.
            </li>
            <li>
              El orden importa: el pack de <b>arriba</b> en la lista de activos tiene prioridad. Los overlays van arriba de tu pack.
            </li>
          </ul>
          <p style={{ marginTop: 16 }}>
            ¿Buscas uno? <Link href="/texturas" style={{ color: "var(--fresa)", fontWeight: 600 }}>Explora las texturas</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
