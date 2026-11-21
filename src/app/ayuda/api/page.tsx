import type { Metadata } from "next";
import styles from "@/components/content/Prose.module.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "API para mods y apps",
  description: "Lista, busca y descarga texturas de Fancy Packs desde tu mod o app. Las descargas cuentan en la página de cada pack.",
  alternates: { canonical: "/ayuda/api" },
};

const API = "/api/v1/packs";

export default function Page() {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <h1>API para mods y apps</h1>
        <p>
          Para instalar texturas y overlays desde el juego. Respuestas en JSON, sin clave, con CORS abierto. Las descargas que hagas con{" "}
          <code>/download</code> suman en la página de cada pack. Dirección base: <code>{SITE_URL}</code>.
        </p>
      </header>
      <div className={styles.bloques}>
        <section className={styles.bloque}>
          <h2>Lista y búsqueda</h2>
          <pre>
            <code>GET {API}?q=&amp;sort=&amp;version=&amp;page=</code>
          </pre>
          <ul>
            <li><span><code>q</code>: texto; tolera acentos y errores de escritura.</span></li>
            <li><span><code>sort</code>: <code>popular</code> (por omisión), <code>downloads</code>, <code>recent</code>, <code>updated</code>, <code>name</code> o <code>relevance</code> (por omisión si hay <code>q</code>).</span></li>
            <li><span><code>version</code>: versión de Minecraft, por ejemplo <code>1.21.11</code>.</span></li>
            <li><span><code>page</code> (desde 1) y <code>limit</code> (1 a 50; 24 por omisión).</span></li>
            <li><span>Opcionales: <code>type</code> (<code>texture</code> u <code>overlay</code>), <code>category</code> (<code>sword</code>, <code>crystal</code>…), <code>resolution</code> (<code>16</code>, <code>32</code>…) y <code>samples=1</code> para incluir el contenido de ejemplo mientras pruebas.</span></li>
          </ul>
          <p>Devuelve <code>total</code>, <code>total_pages</code>, <code>has_more</code>, <code>next</code> y <code>packs</code>: nombre, autor, resolución, versiones, categorías, descargas, ícono, portada y los enlaces a su ficha y a su descarga.</p>
        </section>
        <section className={styles.bloque}>
          <h2>Ficha de un pack</h2>
          <pre>
            <code>GET {API}/{"{slug}"}</code>
          </pre>
          <p>Nombre, autor, descripción, ícono, fotos, categorías, resolución, versiones de Minecraft, descargas, valoración y todas sus versiones con su archivo (nombre, tamaño y SHA-1).</p>
        </section>
        <section className={styles.bloque}>
          <h2>Descarga</h2>
          <pre>
            <code>GET {API}/{"{slug}"}/download</code>
          </pre>
          <ul>
            <li><span><code>?version=1.21.11</code>: la versión más reciente del pack compatible con esa versión de Minecraft.</span></li>
            <li><span><code>?release=2.0.0</code>: una versión concreta del pack.</span></li>
          </ul>
          <p>
            Devuelve <code>url</code> (enlace directo al <code>.zip</code>), <code>size</code>, <code>sha1</code>, <code>sha512</code>, <code>file_name</code>, <code>version</code> y{" "}
            <code>counted</code>. Comprueba el SHA-1 después de bajar el archivo.
          </p>
          <p>
            <b>Cada llamada cuenta como una descarga</b> (la misma IP, una vez por pack cada 24 horas). Llámala justo antes de bajar el archivo, no para armar listas.
          </p>
        </section>
        <section className={styles.bloque}>
          <h2>Errores</h2>
          <pre>
            <code>{`{ "error": { "code": "no_compatible_version", "message": "Este pack no tiene una versión para Minecraft 1.20.1." } }`}</code>
          </pre>
          <p>
            Códigos: <code>not_found</code>, <code>no_file</code>, <code>no_compatible_version</code>, <code>bad_version</code>, <code>bad_release</code> y <code>server_error</code>. El mensaje se puede mostrar tal cual en el juego.
          </p>
        </section>
        <section className={styles.bloque}>
          <h2>Formato anterior</h2>
          <p>
            <code>/api/v1/packs.json</code> y <code>/api/v1/packs/{"{slug}"}.json</code> siguen funcionando igual que antes. Ese formato nunca incluye contenido de ejemplo.
          </p>
        </section>
      </div>
    </div>
  );
}
