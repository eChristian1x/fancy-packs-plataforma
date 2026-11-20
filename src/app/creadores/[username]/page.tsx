import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModCard } from "@/components/cards/ModCard";
import { SampleTag } from "@/components/cards/parts";
import { TextureCard } from "@/components/cards/TextureCard";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { FollowButton } from "@/components/account/FollowButton";
import { Tabs } from "@/components/account/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { getSessionUser } from "@/lib/auth/session";
import { compactNumber, fullNumber, shortDate } from "@/lib/format";
import { getCreator, isFollowing } from "@/lib/queries/people";
import { creatorHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import styles from "./page.module.css";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ ver?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCreator(decodeURIComponent((await params).username)).catch(() => null);
  if (!c) return { title: "Creador no encontrado", robots: { index: false } };
  const desc = c.bio?.slice(0, 160) || `Texturas, overlays y mods de ${c.displayName} en Fancy Packs.`;
  return {
    title: `${c.displayName} (@${c.username})`,
    description: desc,
    alternates: { canonical: creatorHref(c.username) },
    robots: c.isSample || c.isBanned || !c.stats.resources ? { index: false, follow: true } : undefined,
    openGraph: { title: c.displayName, description: desc, images: c.avatarUrl ? [{ url: c.avatarUrl }] : undefined },
  };
}

const TABS = [
  { key: "todo", label: "Todo", types: null },
  { key: "texturas", label: "Texturas", types: ["texture"] },
  { key: "overlays", label: "Overlays", types: ["overlay"] },
  { key: "mods", label: "Mods", types: ["mod"] },
] as const;

export default async function Page({ params, searchParams }: Props) {
  const username = decodeURIComponent((await params).username);
  const sp = await searchParams;
  const c = await getCreator(username);
  if (!c) notFound();
  const viewer = await getSessionUser().catch(() => null);
  const following = viewer && viewer.id !== c.id ? await isFollowing(viewer.id, c.id) : false;
  const path = creatorHref(c.username);
  const counts = Object.fromEntries(TABS.map((t) => [t.key, t.types ? c.resources.filter((r) => (t.types as readonly string[]).includes(r.type)).length : c.resources.length]));
  const tabs = TABS.filter((t) => t.key === "todo" || counts[t.key] > 0);
  const tab = tabs.find((t) => t.key === sp.ver) ?? tabs[0];
  const items = tab.types ? c.resources.filter((r) => (tab.types as readonly string[]).includes(r.type)) : c.resources;
  const packs = items.filter((r) => r.type !== "mod");
  const mods = items.filter((r) => r.type === "mod");
  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: { "@type": "Person", name: c.displayName, alternateName: c.username, url: SITE_URL + path, description: c.bio ?? undefined, sameAs: c.socials.map((s) => s.url) },
  };

  return (
    <div className={`contenedor ${styles.pagina}`}>
      <Breadcrumbs items={[{ href: "/", label: "Inicio" }, { href: "/comunidad", label: "Creadores" }, { href: path, label: c.displayName }]} />

      <header className={styles.cabeza}>
        <Avatar seed={c.username} src={c.avatarUrl} size={112} className={styles.avatar} />
        <div className={styles.datos}>
          <div className={styles.marcas}>
            {c.isSample && <SampleTag />}
            {c.role === "admin" && <span className="chip chip-fresa">Equipo Fancy Packs</span>}
          </div>
          <h1 className={styles.nombre}>
            {c.displayName}
            {c.isVerified && <Icon name="check" size={26} label="Creador verificado" className={styles.verificado} />}
          </h1>
          <p className={styles.usuario}>
            @{c.username} · en Fancy Packs desde {shortDate(c.createdAt)}
          </p>
          {c.isBanned ? <p className={styles.suspendido}>Esta cuenta está suspendida.</p> : c.bio && <p className={styles.bio}>{c.bio}</p>}
          {c.socials.length > 0 && (
            <ul className={styles.redes} aria-label="Redes">
              {c.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="nofollow noopener me" target="_blank">
                    {s.label}
                    <Icon name="external" size={14} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.lado}>
          <dl className={styles.cifras}>
            <div>
              <dt>Publicaciones</dt>
              <dd className="num">{fullNumber(c.stats.resources)}</dd>
            </div>
            <div>
              <dt>Descargas</dt>
              <dd className="num" title={fullNumber(c.stats.downloads)}>
                {compactNumber(c.stats.downloads)}
              </dd>
            </div>
            <div>
              <dt>Seguidores</dt>
              <dd className="num">{fullNumber(c.stats.followers)}</dd>
            </div>
          </dl>
          {viewer?.id === c.id ? (
            <Link href="/cuenta/ajustes" className="boton boton-secundario boton-chico">
              Editar perfil
            </Link>
          ) : (
            !c.isBanned && <FollowButton creatorId={c.id} initial={following} loggedIn={!!viewer} path={path} />
          )}
        </div>
      </header>

      {c.resources.length > 0 && (
        <Tabs label="Publicaciones por tipo" current={tab.key} items={tabs.map((t) => ({ key: t.key, label: t.label, count: counts[t.key], href: t.key === "todo" ? path : `${path}?ver=${t.key}` }))} />
      )}

      {items.length === 0 ? (
        <EmptyState title={`${c.displayName} todavía no publica nada.`} body={viewer?.id === c.id ? "Cuando publiques un pack o un mod, aparece aquí." : undefined} action={viewer?.id === c.id ? { href: "/publicar", label: "Publicar" } : undefined} />
      ) : (
        <>
          {packs.length > 0 && (
            <ul className={styles.grid}>
              {packs.map((r) => (
                <li key={r.id}>
                  <TextureCard r={r} />
                </li>
              ))}
            </ul>
          )}
          {mods.length > 0 && (
            <ul className={styles.gridMods}>
              {mods.map((r) => (
                <li key={r.id}>
                  <ModCard r={r} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </div>
  );
}
