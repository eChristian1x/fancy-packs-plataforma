import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TextureCard } from "@/components/cards/TextureCard";
import { ModCard } from "@/components/cards/ModCard";
import { Loaders, SampleTag } from "@/components/cards/parts";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { ResourceType } from "@/lib/db/schema";
import { compactNumber, fullNumber, relativeDate, shortDate } from "@/lib/format";
import { getRelated, getResource, type ResourceDetail } from "@/lib/queries/detail";
import { categoryHref, creatorHref, resourceHref, TYPE_LABEL, TYPE_PATH } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import { versionRange, sortVersions } from "@/lib/versions";
import { CopyButton } from "./CopyButton";
import { Gallery } from "./Gallery";
import { RichText } from "./RichText";
import { Stars } from "./Stars";
import { Versions } from "./Versions";
import { ResourceActions } from "./ResourceActions";
import { Comments } from "./Comments";
import styles from "./ResourcePage.module.css";

export const bytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export async function loadOr404(type: ResourceType, slug: string) {
  const r = await getResource(type, decodeURIComponent(slug)).catch((e) => {
    console.error("[recurso]", e);
    throw e;
  });
  if (!r) notFound();
  return r;
}

export async function resourceMetadata(type: ResourceType, slug: string): Promise<Metadata> {
  const r = await getResource(type, decodeURIComponent(slug)).catch(() => null);
  if (!r) return { title: "No encontrado", robots: { index: false } };
  const what = type === "mod" ? "Mod" : type === "overlay" ? "Overlay" : "Textura";
  const res = r.resolution ? ` ${r.resolution}x` : "";
  const title = `${r.name}${res} · ${what} para Minecraft ${versionRange(r.mcVersions)}`;
  const img = r.coverUrl ?? r.gallery[0]?.url;
  return {
    title,
    description: r.summary,
    alternates: { canonical: resourceHref(type, r.slug) },
    robots: r.isSample ? { index: false, follow: true } : undefined,
    openGraph: { title, description: r.summary, type: "website", images: img ? [{ url: img }] : undefined },
    twitter: { card: "summary_large_image" },
  };
}

function jsonLd(r: ResourceDetail) {
  const v = r.versions[0];
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": r.type === "mod" ? "SoftwareApplication" : "CreativeWork",
    name: r.name,
    description: r.summary,
    url: SITE_URL + resourceHref(r.type, r.slug),
    image: r.coverUrl ? new URL(r.coverUrl, SITE_URL).toString() : undefined,
    author: { "@type": "Person", name: r.authorName, url: SITE_URL + creatorHref(r.owner.username) },
    datePublished: r.publishedAt ?? undefined,
    dateModified: r.updatedAt,
    keywords: [...r.categories.map((c) => c.name), "Minecraft", ...r.mcVersions.slice(-3)].join(", "),
    interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/DownloadAction", userInteractionCount: r.downloadCount },
  };
  if (r.type === "mod") {
    ld.applicationCategory = "GameApplication";
    ld.operatingSystem = "Minecraft Java Edition";
    ld.softwareVersion = v?.versionNumber;
    ld.offers = { "@type": "Offer", price: 0, priceCurrency: "USD" };
  }
  if (r.ratingCount >= 3) ld.aggregateRating = { "@type": "AggregateRating", ratingValue: (r.ratingSum / r.ratingCount).toFixed(1), ratingCount: r.ratingCount };
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}

export type Viewer = { id: string; favorite: boolean; rating: number | null; canEdit: boolean; isBanned: boolean; staff: boolean } | null;

export async function ResourcePage({ r, viewer }: { r: ResourceDetail; viewer: Viewer }) {
  const related = await getRelated(r.type, r.id, r.categories.map((c) => c.slug), 4).catch(() => []);
  const latest = r.versions[0];
  const file = latest?.files[0];
  const rating = r.ratingCount ? r.ratingSum / r.ratingCount : 0;
  const label = TYPE_LABEL[r.type];
  const gallery = r.gallery.length ? r.gallery : r.coverUrl ? [{ url: r.coverUrl, width: null, height: null, caption: null }] : [];
  const versions = sortVersions(r.mcVersions);
  const isMod = r.type === "mod";

  return (
    <div className="contenedor">
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: TYPE_PATH[r.type], label: label.many },
          { href: resourceHref(r.type, r.slug), label: r.name },
        ]}
      />

      <header className={styles.cabeza}>
        {isMod && r.iconUrl && <img src={r.iconUrl} alt="" width={72} height={72} className={styles.icono} />}
        <div className={styles.titulos}>
          <div className={styles.marcas}>
            {r.featured && <span className="chip chip-miel">Destacado</span>}
            {r.resolution && <span className="chip chip-res">{r.resolution}x</span>}
            {r.isSample && <SampleTag />}
          </div>
          <h1 className={styles.nombre}>{r.name}</h1>
          <p className={styles.resumen}>{r.summary}</p>
          <p className={styles.autor}>
            de <Link href={creatorHref(r.owner.username)}>{r.authorName}</Link>
            {r.authorName !== r.owner.displayName && <span> · publicado por {r.owner.displayName}</span>}
          </p>
        </div>
      </header>

      <div className={styles.rejilla}>
        {gallery.length > 0 && (
          <div className={styles.galeria}>
            <Gallery images={gallery} name={r.name} />
          </div>
        )}
        <div className={styles.principal}>

          <section aria-labelledby="sobre" className={styles.bloque}>
            <h2 id="sobre" className={styles.h2}>
              Descripción
            </h2>
            {r.description ? <RichText text={r.description} /> : <p className={styles.tenue}>{r.summary}</p>}
            {r.permissionNote && (
              <p className={styles.permiso}>
                <Icon name="check" size={16} /> {r.permissionNote}
              </p>
            )}
          </section>

          {isMod && <Versions r={r} />}

          <Comments r={r} viewer={viewer} />
        </div>

        <aside className={styles.lateral} aria-label="Descarga y datos">
          <div className={styles.descarga}>
            {file ? (
              <>
                <a className="boton boton-principal" href={`/descargar/${encodeURIComponent(r.slug)}`} download={file.fileName}>
                  <Icon name="download" /> Descargar {isMod && latest ? latest.versionNumber : ""}
                </a>
                <dl className={styles.archivo}>
                  <div>
                    <dt>Archivo</dt>
                    <dd className={styles.nombreArchivo}>{file.fileName}</dd>
                  </div>
                  <div>
                    <dt>Tamaño</dt>
                    <dd className="num">{bytes(file.sizeBytes)}</dd>
                  </div>
                  <div>
                    <dt>SHA-1</dt>
                    <dd className={styles.hash}>
                      <code title={file.sha1}>{file.sha1.slice(0, 12)}…</code>
                      <CopyButton value={file.sha1} label="Copiar SHA-1" className={styles.copiar} />
                    </dd>
                  </div>
                </dl>
                {isMod && latest && latest.dependencies.some((d) => d.kind === "required") && (
                  <p className={styles.nota}>
                    <Icon name="alert" size={15} /> Necesita {latest.dependencies.filter((d) => d.kind === "required").map((d) => d.name).join(", ")}.
                  </p>
                )}
                <Link href={isMod ? "/ayuda/instalar#mods" : "/ayuda/instalar"} className={styles.ayuda}>
                  ¿Cómo lo instalo?
                </Link>
              </>
            ) : (
              <p className={styles.tenue}>Este recurso todavía no tiene archivos para descargar.</p>
            )}
            <ResourceActions resourceId={r.id} path={resourceHref(r.type, r.slug)} viewer={viewer} />
          </div>

          <dl className={styles.datos}>
            <div>
              <dt>Descargas</dt>
              <dd className="num" title={fullNumber(r.downloadCount)}>
                {compactNumber(r.downloadCount)}
              </dd>
            </div>
            <div>
              <dt>Favoritos</dt>
              <dd className="num">{compactNumber(r.favoriteCount)}</dd>
            </div>
            <div className={styles.ancho}>
              <dt>Valoración</dt>
              <dd>{r.ratingCount ? <Stars value={rating} count={r.ratingCount} /> : <span className={styles.tenue}>Sin valoraciones</span>}</dd>
            </div>
            {r.resolution && (
              <div className={styles.ancho}>
                <dt>Resolución</dt>
                <dd className="num">{r.resolution}x</dd>
              </div>
            )}
            {isMod && latest && (
              <div className={styles.ancho}>
                <dt>Versión más reciente</dt>
                <dd className="num">{latest.versionNumber}</dd>
              </div>
            )}
            <div className={styles.ancho}>
              <dt>Minecraft</dt>
              <dd>
                <ul className={styles.versiones} aria-label="Versiones compatibles">
                  {versions.map((v) => (
                    <li key={v}>
                      <Link href={`${TYPE_PATH[r.type]}?version=${encodeURIComponent(v)}`}>{v}</Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            {isMod && r.loaders.length > 0 && (
              <div className={styles.ancho}>
                <dt>Loaders</dt>
                <dd>
                  <Loaders list={r.loaders} />
                </dd>
              </div>
            )}
            {r.categories.length > 0 && (
              <div className={styles.ancho}>
                <dt>Categorías</dt>
                <dd>
                  <ul className={styles.chips}>
                    {r.categories.map((c) => (
                      <li key={c.slug}>
                        <Link href={categoryHref(r.type, c.slug)} className="chip">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            <div>
              <dt>Publicado</dt>
              <dd>
                <time dateTime={r.publishedAt ?? undefined}>{shortDate(r.publishedAt)}</time>
              </dd>
            </div>
            <div>
              <dt>Actualizado</dt>
              <dd>
                <time dateTime={r.updatedAt} title={shortDate(r.updatedAt)}>
                  {relativeDate(r.updatedAt)}
                </time>
              </dd>
            </div>
          </dl>

          <div className={styles.creador}>
            <Avatar seed={r.owner.username} size={44} src={r.owner.avatarUrl} />
            <div>
              <Link href={creatorHref(r.owner.username)} className={styles.creadorNombre}>
                {r.owner.displayName}
                {r.owner.isVerified && <Icon name="check" size={15} label="Verificado" className={styles.verificado} />}
              </Link>
              {r.owner.bio && <p className={styles.creadorBio}>{r.owner.bio}</p>}
            </div>
          </div>

          {viewer?.canEdit && (
            <Link href={`/panel/recursos/${r.id}`} className="boton boton-secundario boton-chico">
              Editar publicación
            </Link>
          )}
          <Link href={`/reportar?recurso=${r.id}`} className={styles.reportar} rel="nofollow">
            <Icon name="alert" size={15} /> Reportar {r.type === "texture" ? "esta textura" : `este ${label.one.toLowerCase()}`}
          </Link>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="relacionados" className={styles.relacionados}>
          <h2 id="relacionados" className={styles.h2}>
            {isMod ? "Otros mods" : `Más ${label.many.toLowerCase()} parecidas`.replace("parecidas", r.type === "overlay" ? "parecidos" : "parecidas")}
          </h2>
          <ul className={isMod ? styles.listaMods : styles.lista}>
            {related.map((x) => (
              <li key={x.id}>{isMod ? <ModCard r={x} /> : <TextureCard r={x} />}</li>
            ))}
          </ul>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(r) }} />
    </div>
  );
}

