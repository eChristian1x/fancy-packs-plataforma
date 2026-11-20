import type { Metadata } from "next";
import Link from "next/link";
import { SampleTag } from "@/components/cards/parts";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { compactNumber, plural } from "@/lib/format";
import { getCreatorDirectory } from "@/lib/queries/people";
import { creatorHref, TYPE_LABEL } from "@/lib/routes";
import type { ResourceType } from "@/lib/db/schema";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Creadores",
  description: "Los creadores que publican texturas, overlays y mods en Fancy Packs. Sigue a tus favoritos para ver lo que suben.",
  alternates: { canonical: "/comunidad" },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function Page({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 48);
  const creators = await getCreatorDirectory(q).catch((e) => {
    console.error("[creadores]", e);
    return null;
  });
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <Breadcrumbs items={[{ href: "/", label: "Inicio" }, { href: "/comunidad", label: "Creadores" }]} />
        <h1>Creadores</h1>
        <p>Quienes hacen los packs y mods. Entra a su perfil para ver todo lo que publican y seguirlos.</p>
        <form action="/comunidad" role="search" className={styles.buscar}>
          <Icon name="search" size={18} />
          <input type="search" name="q" defaultValue={q} placeholder="Buscar creador" aria-label="Buscar creador" />
        </form>
      </header>
      {creators === null ? (
        <EmptyState tone="error" title="No se pudo cargar la lista de creadores." body="Recarga la página en unos segundos." />
      ) : creators.length === 0 ? (
        <EmptyState title={q ? `Ningún creador coincide con “${q}”.` : "Todavía no hay creadores con publicaciones."} action={q ? { href: "/comunidad", label: "Ver todos" } : { href: "/publicar", label: "Publicar el primero" }} />
      ) : (
        <ol className={styles.lista}>
          {creators.map((c) => (
            <li key={c.id} className={styles.creador}>
              <Avatar seed={c.username} src={c.avatarUrl} size={56} />
              <div className={styles.texto}>
                <Link href={creatorHref(c.username)} className={styles.nombre}>
                  {c.displayName}
                  {c.isVerified && <Icon name="check" size={16} label="Verificado" className={styles.verificado} />}
                </Link>
                <span className={styles.usuario}>
                  @{c.username} {c.isSample && <SampleTag />}
                </span>
                {c.bio && <p className={styles.bio}>{c.bio}</p>}
                <p className={styles.tipos}>{(c.types as ResourceType[]).map((t) => TYPE_LABEL[t].many).join(", ")}</p>
              </div>
              <dl className={styles.cifras}>
                <div>
                  <dt>Publicaciones</dt>
                  <dd className="num">{c.resources}</dd>
                </div>
                <div>
                  <dt>Descargas</dt>
                  <dd className="num">{compactNumber(c.downloads)}</dd>
                </div>
                <div>
                  <dt>Seguidores</dt>
                  <dd className="num">{c.followers}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.pie}>
        ¿Haces texturas o mods? <Link href="/publicar">Publica en Fancy Packs</Link> · {plural(creators?.length ?? 0, "creador", "creadores")} con publicaciones
      </p>
    </div>
  );
}
