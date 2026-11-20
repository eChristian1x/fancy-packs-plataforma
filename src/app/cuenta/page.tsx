import type { Metadata } from "next";
import Link from "next/link";
import { ModCard } from "@/components/cards/ModCard";
import { TextureCard } from "@/components/cards/TextureCard";
import { Tabs } from "@/components/account/Tabs";
import styles from "@/components/account/Account.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/session";
import { relativeDate, shortDate } from "@/lib/format";
import { getAccountCounts, getDownloadHistory, getFavorites, getFollowing } from "@/lib/queries/people";
import type { ResourceCard } from "@/lib/queries/resources";
import { creatorHref, resourceHref, TYPE_LABEL } from "@/lib/routes";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

type Props = { searchParams: Promise<{ ver?: string; bienvenida?: string }> };

function Cards({ items }: { items: ResourceCard[] }) {
  const mods = items.filter((r) => r.type === "mod");
  const packs = items.filter((r) => r.type !== "mod");
  return (
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
  );
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await requireUser("/cuenta");
  const tab = sp.ver === "descargas" || sp.ver === "siguiendo" ? sp.ver : "favoritos";
  const counts = await getAccountCounts(user.id);

  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <Avatar seed={user.username} src={user.avatarUrl} size={64} />
        <div className={styles.cabezaTexto}>
          <h1>{user.displayName}</h1>
          <p className={styles.sub}>
            @{user.username} · <Link href={creatorHref(user.username)}>Ver mi perfil público</Link> · <Link href="/cuenta/ajustes">Ajustes</Link>
          </p>
        </div>
        <Link href="/publicar" className="boton boton-secundario boton-chico">
          Publicar algo
        </Link>
      </header>

      {sp.bienvenida && (
        <div className={styles.bienvenida} role="status">
          <b>Tu cuenta está lista.</b>
          <p>
            Guarda packs con el corazón, sigue a tus creadores favoritos y, si haces texturas, <Link href="/publicar">publica la primera</Link>.
          </p>
        </div>
      )}

      <Tabs
        label="Secciones de tu cuenta"
        current={tab}
        items={[
          { key: "favoritos", href: "/cuenta", label: "Favoritos", count: counts.favorites },
          { key: "descargas", href: "/cuenta?ver=descargas", label: "Historial de descargas", count: counts.downloads },
          { key: "siguiendo", href: "/cuenta?ver=siguiendo", label: "Siguiendo", count: counts.following },
        ]}
      />

      {tab === "favoritos" && <Favorites userId={user.id} />}
      {tab === "descargas" && <History userId={user.id} />}
      {tab === "siguiendo" && <Following userId={user.id} />}
    </div>
  );
}

async function Favorites({ userId }: { userId: string }) {
  const items = await getFavorites(userId);
  if (!items.length)
    return <EmptyState title="Todavía no guardas nada." body="Toca “Guardar en favoritos” en cualquier pack o mod y aparece aquí." action={{ href: "/texturas", label: "Explorar texturas" }} />;
  return <Cards items={items} />;
}

async function History({ userId }: { userId: string }) {
  const items = await getDownloadHistory(userId);
  if (!items.length)
    return <EmptyState title="No has descargado nada con la sesión iniciada." body="Las descargas que hagas desde ahora quedan aquí para reinstalar rápido." action={{ href: "/texturas", label: "Explorar texturas" }} />;
  return (
    <ul className={styles.lista}>
      {items.map(({ card, lastAt, times, versionNumber, latestVersion }) => (
        <li key={card.id} className={styles.fila}>
          {card.coverUrl || card.iconUrl ? <img src={(card.coverUrl ?? card.iconUrl)!} alt="" width={56} height={40} loading="lazy" /> : <span className={styles.sinImg} />}
          <div className={styles.filaTexto}>
            <Link href={resourceHref(card.type, card.slug)}>{card.name}</Link>
            <span>
              {TYPE_LABEL[card.type].one} · <time dateTime={lastAt} title={shortDate(lastAt)}>{relativeDate(lastAt)}</time>
              {times > 1 ? ` · ${times} veces` : ""}
              {versionNumber ? ` · versión ${versionNumber}` : ""}
            </span>
            {latestVersion && versionNumber && latestVersion !== versionNumber && <span className={styles.nueva}>Hay versión nueva: {latestVersion}</span>}
          </div>
          <span />
          <a href={`/descargar/${encodeURIComponent(card.slug)}`} className="boton boton-secundario boton-chico">
            Descargar otra vez
          </a>
        </li>
      ))}
    </ul>
  );
}

async function Following({ userId }: { userId: string }) {
  const { creators, feed } = await getFollowing(userId);
  if (!creators.length)
    return <EmptyState title="No sigues a ningún creador." body="Entra al perfil de un creador y toca “Seguir” para ver aquí lo que publica." action={{ href: "/comunidad", label: "Ver creadores" }} />;
  return (
    <>
      <ul className={styles.creadores}>
        {creators.map((c) => (
          <li key={c.id}>
            <Link href={creatorHref(c.username)}>
              <Avatar seed={c.username} src={c.avatarUrl} size={32} />
              {c.displayName}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className={styles.h2}>Lo último de quienes sigues</h2>
      {feed.length ? <Cards items={feed} /> : <p className={styles.sub}>Todavía no han publicado nada.</p>}
    </>
  );
}
