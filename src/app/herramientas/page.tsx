import type { Metadata } from "next";
import styles from "@/components/content/Prose.module.css";

export const metadata: Metadata = {
  title: "Herramientas",
  description: "Herramientas de Fancy Packs para encontrar, comparar y revisar resource packs de Minecraft.",
};

const TOOLS = [
  {
    name: "Buscar por captura",
    text: "Sube una captura de Minecraft y te mostramos los packs de Fancy Packs que más se parecen.",
    priority: true,
  },
  { name: "Comparador de packs", text: "Pon dos packs lado a lado y compara espada, cristales, pociones y bloques." },
  { name: "Visor de texturas", text: "Abre un .zip y recorre sus texturas sin instalarlo." },
  { name: "Analizador de .zip", text: "Revisa versión del pack, archivos que faltan y texturas que no hacen nada." },
  { name: "Conversor de versiones", text: "Actualiza un pack viejo para que funcione en una versión nueva de Minecraft." },
  { name: "Personalización PvP", text: "Arma tu propio pack combinando espada, fuego, escudo y tótem de distintos packs." },
];

/** Las herramientas se construyen en la etapa 7. Esta página solo dice qué viene: nada se simula. */
export default function Page() {
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <h1>Herramientas</h1>
        <p>Herramientas propias de Fancy Packs. Todavía no están disponibles; esto es lo que estamos construyendo.</p>
      </header>
      <ul className={styles.bloques}>
        {TOOLS.map((t) => (
          <li key={t.name} className={`${styles.bloque} ${t.priority ? styles.prioridad : ""}`}>
            <span className={styles.estado}>{t.priority ? "Primera en llegar" : "En desarrollo"}</span>
            <h2>{t.name}</h2>
            <p>{t.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
