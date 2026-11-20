import { ModCard } from "@/components/cards/ModCard";
import { OverlayTile } from "@/components/cards/OverlayTile";
import { ResourceRows } from "@/components/cards/ResourceRow";
import { TextureCard } from "@/components/cards/TextureCard";
import { Creators } from "@/components/home/Creators";
import { Directory } from "@/components/home/Directory";
import { Hero } from "@/components/home/Hero";
import type { HotbarSlot } from "@/components/home/Hotbar";
import { Rail } from "@/components/home/Rail";
import { Recommended } from "@/components/home/Recommended";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Stats } from "@/components/home/Stats";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getCategoryCounts,
  getFeatured,
  getLatest,
  getPopular,
  getStats,
  getTopCreators,
} from "@/lib/queries/resources";
import { categoryHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import styles from "./page.module.css";

/** Ejecuta una consulta sin tumbar la página: cada sección muestra su propio error. */
async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    console.error("[inicio]", e);
    return null;
  }
}

const ERROR = { title: "No se pudo cargar esta sección.", body: "La base de datos no respondió. Recarga la página en unos segundos.", tone: "error" as const };

export default async function Inicio() {
  const [stats, categories, popular, latest, mods, overlays, featured, creators] = await Promise.all([
    safe(getStats()),
    safe(getCategoryCounts()),
    safe(getPopular("texture", 4)),
    safe(getLatest("texture", 6)),
    safe(getLatest("mod", 6)),
    safe(getPopular("overlay", 8)),
    safe(getFeatured(6)),
    safe(getTopCreators(6)),
  ]);
  const now = Date.now();

  // Pack de portada: la textura destacada con más descargas. Recomendados: el resto de destacados.
  const spotlight = featured?.find((r) => r.type === "texture" && r.coverUrl) ?? popular?.[0] ?? null;
  const recommended = (featured ?? []).filter((r) => r.id !== spotlight?.id).slice(0, 4);

  // Si no se pudieron leer las categorías, la hotbar no se muestra (mejor nada que cifras falsas).
  const textureCats = (categories ?? []).filter((c) => c.type === "texture");
  const slots: HotbarSlot[] =
    categories && stats
      ? [
          ...textureCats.slice(0, 8).map((c) => ({ key: c.slug, name: c.name, count: c.count, icon: c.icon ?? "populares", href: categoryHref("texture", c.slug) })),
          { key: "todas", name: "Todas las texturas", count: stats.textures, icon: "populares", href: "/texturas" },
        ]
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fancy Packs",
    url: SITE_URL,
    inLanguage: "es",
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/buscar?q={q}`, "query-input": "required name=q" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <Hero spotlight={spotlight} slots={slots} />

      {stats && <Stats stats={stats} />}

      {/* ---------------- Texturas populares */}
      <section className={`contenedor ${styles.seccion}`} aria-labelledby="populares">
        <SectionHeader
          id="populares"
          title="Texturas populares"
          description="Las más descargadas. Cada tarjeta dice resolución, versiones y modalidad."
          action={{ href: "/texturas?orden=descargas", label: "Ver todas las texturas" }}
        />
        {popular === null ? (
          <EmptyState {...ERROR} />
        ) : popular.length ? (
          <ul className={styles.cuatro}>
            {popular.map((r, i) => (
              <li key={r.id}>
                <TextureCard r={r} priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Todavía no hay texturas publicadas." body="Cuando un creador publique su pack, aparece aquí." action={{ href: "/publicar", label: "Publicar un pack" }} />
        )}
      </section>

      {/* ---------------- Últimas texturas + creadores */}
      <div className={`contenedor ${styles.seccion} ${styles.dividida}`}>
        <section aria-labelledby="ultimas">
          <SectionHeader size="s" id="ultimas" title="Últimas texturas" action={{ href: "/texturas?orden=recientes", label: "Ver más recientes" }} />
          {latest === null ? (
            <EmptyState {...ERROR} />
          ) : latest.length ? (
            <ResourceRows items={latest} now={now} />
          ) : (
            <EmptyState title="Aún no hay texturas nuevas." />
          )}
        </section>
        <section aria-labelledby="creadores">
          <SectionHeader size="s" id="creadores" title="Creadores destacados" action={{ href: "/comunidad", label: "Ver todos" }} />
          {creators === null ? (
            <EmptyState {...ERROR} />
          ) : creators.length ? (
            <Creators items={creators} />
          ) : (
            <EmptyState title="Todavía no hay creadores con publicaciones." action={{ href: "/publicar", label: "Publicar el primero" }} />
          )}
        </section>
      </div>

      {/* ---------------- Mods recientes */}
      <section className={`contenedor ${styles.seccion}`} aria-labelledby="mods">
        <SectionHeader id="mods" title="Mods recientes" description="Revisa el loader y la versión antes de descargar." action={{ href: "/mods", label: "Ver todos los mods" }} />
        {mods === null ? (
          <EmptyState {...ERROR} />
        ) : mods.length ? (
          <ul className={styles.tres}>
            {mods.map((r) => (
              <li key={r.id}>
                <ModCard r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Todavía no hay mods publicados." />
        )}
      </section>

      {/* ---------------- Overlays populares */}
      <section className={`contenedor ${styles.seccion}`} aria-labelledby="overlays">
        <SectionHeader id="overlays" title="Overlays populares" description="Se ponen encima de tu pack para cambiar solo una cosa." />
        {overlays === null ? (
          <EmptyState {...ERROR} />
        ) : overlays.length ? (
          <Rail label="Overlays populares">
            {overlays.map((r) => (
              <li key={r.id}>
                <OverlayTile r={r} />
              </li>
            ))}
          </Rail>
        ) : (
          <EmptyState title="Todavía no hay overlays publicados." />
        )}
      </section>

      {/* ---------------- Recomendados */}
      {recommended.length > 0 && (
        <section className={`contenedor ${styles.seccion}`} aria-labelledby="recomendados">
          <SectionHeader id="recomendados" title="Recomendados por Fancy Packs" description="Los probamos y los dejamos aquí." />
          <Recommended items={recommended} />
        </section>
      )}

      {/* ---------------- Categorías principales */}
      {stats && categories && (
        <section className={`contenedor ${styles.seccion}`} aria-labelledby="categorias">
          <SectionHeader id="categorias" title="Categorías" />
          <Directory stats={stats} categories={categories} />
        </section>
      )}
    </>
  );
}
