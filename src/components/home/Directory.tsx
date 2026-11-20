import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PixelIcon, hasPixelIcon } from "@/components/ui/PixelIcon";
import { fullNumber } from "@/lib/format";
import type { CategoryCount, PlatformStats } from "@/lib/queries/resources";
import { categoryHref, TYPE_PATH } from "@/lib/routes";
import type { ResourceType } from "@/lib/db/schema";
import styles from "./Directory.module.css";

const TYPES: { type: ResourceType; icon: IconName; title: string; text: string; stat: keyof PlatformStats; unit: [string, string] }[] = [
  { type: "texture", icon: "texture", title: "Texturas", text: "Resource packs completos para PvP y supervivencia.", stat: "textures", unit: ["textura", "texturas"] },
  { type: "overlay", icon: "overlay", title: "Overlays", text: "Cambios pequeños que se ponen encima de cualquier pack.", stat: "overlays", unit: ["overlay", "overlays"] },
  { type: "mod", icon: "mod", title: "Mods", text: "Para Fabric, Forge, NeoForge y Quilt.", stat: "mods", unit: ["mod", "mods"] },
];

/** Categorías principales: cada tipo de recurso con sus categorías y cuántos hay en cada una. */
export function Directory({ stats, categories }: { stats: PlatformStats; categories: CategoryCount[] }) {
  return (
    <div className={styles.grid}>
      {TYPES.map((t) => {
        const n = stats[t.stat] as number;
        const cats = categories.filter((c) => c.type === t.type);
        return (
          <section key={t.type} className={styles.tipo} aria-labelledby={`dir-${t.type}`}>
            <header>
              <span className={styles.icono}>
                <Icon name={t.icon} size={22} />
              </span>
              <div>
                <h3 id={`dir-${t.type}`}>
                  <Link href={TYPE_PATH[t.type]}>{t.title}</Link>
                </h3>
                <p className="num">
                  {fullNumber(n)} {n === 1 ? t.unit[0] : t.unit[1]}
                </p>
              </div>
            </header>
            <p className={styles.texto}>{t.text}</p>
            <ul className={styles.cats}>
              {cats.map((c) => (
                <li key={c.slug}>
                  <Link href={categoryHref(c.type, c.slug)}>
                    {hasPixelIcon(c.icon) && <PixelIcon name={c.icon} size={16} />}
                    <span>{c.name}</span>
                    <span className={`${styles.n} num`}>{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className={`${styles.tipo} ${styles.herramientas}`} aria-labelledby="dir-tools">
        <header>
          <span className={styles.icono}>
            <Icon name="tools" size={22} />
          </span>
          <div>
            <h3 id="dir-tools">
              <Link href="/herramientas">Herramientas</Link>
            </h3>
            <p>En desarrollo</p>
          </div>
        </header>
        <p className={styles.texto}>
          Buscar packs con una captura del juego, comparar dos packs, ver las texturas de un .zip y convertir packs entre
          versiones.
        </p>
        <Link href="/herramientas" className="boton boton-secundario boton-chico">
          Ver qué viene
        </Link>
      </section>
    </div>
  );
}
