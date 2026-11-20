import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Downloads, SampleTag } from "@/components/cards/parts";
import type { ResourceCard } from "@/lib/queries/resources";
import { creatorHref, resourceHref } from "@/lib/routes";
import { Hotbar, type HotbarSlot } from "./Hotbar";
import styles from "./Hero.module.css";

export function Hero({ spotlight, slots }: { spotlight: ResourceCard | null; slots: HotbarSlot[] }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-titulo">
      <div className={`contenedor ${styles.grid}`}>
        <div className={styles.texto}>
          <h1 id="hero-titulo">Encuentra el pack con el que juegas mejor.</h1>
          <p className={styles.bajada}>
            Texturas PvP, overlays y mods para Minecraft Java. Cada pack se publica con permiso de su creador y se revisa
            antes de salir.
          </p>
          <form role="search" aria-label="Buscar en el catálogo" action="/buscar" className={styles.buscar}>
            <label htmlFor="hero-q" className="solo-lectores">
              Buscar packs, mods o creadores
            </label>
            <Icon name="search" size={22} />
            <input id="hero-q" type="search" name="q" placeholder="Nombre del pack, creador o modalidad" autoComplete="off" enterKeyHint="search" />
            <button type="submit" className="boton boton-principal">
              Buscar
            </button>
          </form>
          <div className={styles.accesos}>
            <Link href="/texturas" className="boton boton-secundario">
              <Icon name="texture" />
              Explorar texturas
            </Link>
            <Link href="/mods" className="boton boton-secundario">
              <Icon name="mod" />
              Explorar mods
            </Link>
          </div>
        </div>

        {spotlight && (
          <figure className={styles.portada}>
            <Link href={resourceHref(spotlight.type, spotlight.slug)} className={styles.portadaImg} aria-label={`Ver ${spotlight.name}`}>
              {spotlight.coverUrl && (
                <Image src={spotlight.coverUrl} alt="" fill priority sizes="(max-width: 960px) 92vw, 540px" />
              )}
              <span className={styles.etiquetas}>
                <span className="chip chip-miel chip-sobre">Pack destacado</span>
                {spotlight.isSample && <SampleTag />}
              </span>
            </Link>
            <figcaption>
              <div>
                <Link href={resourceHref(spotlight.type, spotlight.slug)} className={styles.nombre}>
                  {spotlight.name}
                </Link>
                <span className={styles.por}>
                  de <Link href={creatorHref(spotlight.ownerUsername)}>{spotlight.authorName}</Link>
                  {spotlight.resolution ? `, ${spotlight.resolution}x` : ""}
                </span>
              </div>
              <Downloads n={spotlight.downloadCount} />
            </figcaption>
          </figure>
        )}
      </div>

      {slots.length > 0 && (
        <div className={styles.banda}>
          <div className="contenedor">
            <Hotbar slots={slots} />
          </div>
        </div>
      )}
    </section>
  );
}
