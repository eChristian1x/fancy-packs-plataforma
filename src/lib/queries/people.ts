import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import { downloads, favorites, follows, profiles, resources, type SocialLink } from "@/lib/db/schema";
import { CACHE_TAG, selectCards, type ResourceCard } from "./resources";

// ------------------------------------------------------------------ perfil público

export type CreatorProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: SocialLink[];
  isVerified: boolean;
  isSample: boolean;
  isBanned: boolean;
  role: string;
  createdAt: string;
  stats: { resources: number; downloads: number; followers: number; favorites: number };
  resources: ResourceCard[];
};

export const CREATORS_TAG = "creators";

async function loadCreator(username: string): Promise<CreatorProfile | null> {
  const db = await getDb();
  const [p] = await db.select().from(profiles).where(sql`lower(${profiles.username}) = lower(${username})`).limit(1);
  if (!p) return null;
  const [[s], [f], items] = await Promise.all([
    db
      .select({
        resources: sql<number>`count(*)::int`,
        downloads: sql<number>`coalesce(sum(${resources.downloadCount}), 0)::int`,
        favorites: sql<number>`coalesce(sum(${resources.favoriteCount}), 0)::int`,
      })
      .from(resources)
      .where(and(eq(resources.ownerId, p.id), eq(resources.status, "published"))),
    db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.creatorId, p.id)),
    selectCards(eq(resources.ownerId, p.id), [desc(resources.publishedAt)], 60),
  ]);
  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    bannerUrl: p.bannerUrl,
    socials: p.socials ?? [],
    isVerified: p.isVerified,
    isSample: p.isSample,
    isBanned: p.isBanned,
    role: p.role,
    createdAt: new Date(p.createdAt).toISOString(),
    stats: { resources: s.resources, downloads: s.downloads, favorites: s.favorites, followers: f.n },
    resources: items,
  };
}

export const getCreator = (username: string) =>
  unstable_cache(() => loadCreator(username), ["creator", username.toLowerCase()], { tags: [CACHE_TAG, CREATORS_TAG], revalidate: 60 })();

export async function isFollowing(followerId: string, creatorId: string) {
  const db = await getDb();
  const r = await db.select({ x: follows.followerId }).from(follows).where(and(eq(follows.followerId, followerId), eq(follows.creatorId, creatorId))).limit(1);
  return r.length > 0;
}

/** Directorio de creadores: los que tienen algo publicado, por descargas. */
export const getCreatorDirectory = unstable_cache(
  async (q: string) => {
    const db = await getDb();
    const term = q.trim().slice(0, 48);
    return db
      .select({
        id: profiles.id,
        username: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        isVerified: profiles.isVerified,
        isSample: profiles.isSample,
        resources: sql<number>`count(${resources.id})::int`,
        downloads: sql<number>`coalesce(sum(${resources.downloadCount}), 0)::int`,
        followers: sql<number>`(select count(*)::int from follows f where f.creator_id = ${profiles.id})`,
        types: sql<string[]>`array_agg(distinct ${resources.type}::text)`,
      })
      .from(profiles)
      .innerJoin(resources, and(eq(resources.ownerId, profiles.id), eq(resources.status, "published")))
      .where(
        and(
          eq(profiles.isBanned, false),
          term
            ? sql`fp_normalize(${profiles.displayName} || ' ' || ${profiles.username}) like '%' || fp_normalize(${term.replace(/[\\%_]/g, (c) => "\\" + c)}) || '%'`
            : undefined,
        ),
      )
      .groupBy(profiles.id)
      .orderBy(desc(sql`sum(${resources.downloadCount})`))
      .limit(60);
  },
  ["creator-directory"],
  { tags: [CACHE_TAG, CREATORS_TAG], revalidate: 120 },
);

// ------------------------------------------------------------------ cuenta del usuario (sin caché)

export async function getFavorites(userId: string) {
  const db = await getDb();
  const ids = await db
    .select({ id: favorites.resourceId, at: favorites.createdAt })
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt))
    .limit(120);
  if (!ids.length) return [];
  const cards = await selectCards(inArray(resources.id, ids.map((x) => x.id)), [desc(resources.publishedAt)], 120);
  const order = new Map(ids.map((x, i) => [x.id, i]));
  return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

const DRID = sql.raw(`"downloads"."resource_id"`);

export type HistoryItem = { card: ResourceCard; lastAt: string; times: number; versionNumber: string | null; latestVersion: string | null };

export async function getDownloadHistory(userId: string): Promise<HistoryItem[]> {
  const db = await getDb();
  const rows = await db
    .select({
      resourceId: downloads.resourceId,
      lastAt: sql<string>`max(${downloads.createdAt})`,
      times: sql<number>`count(*)::int`,
      versionNumber: sql<string | null>`(select v.version_number from downloads d2 join resource_versions v on v.id = d2.version_id
        where d2.user_id = ${userId} and d2.resource_id = ${DRID} order by d2.created_at desc limit 1)`,
      latestVersion: sql<string | null>`(select v.version_number from resource_versions v where v.resource_id = ${DRID}
        and v.published_at is not null order by v.published_at desc limit 1)`,
    })
    .from(downloads)
    .where(eq(downloads.userId, userId))
    .groupBy(downloads.resourceId)
    .orderBy(desc(sql`max(${downloads.createdAt})`))
    .limit(100);
  if (!rows.length) return [];
  const cards = await selectCards(inArray(resources.id, rows.map((r) => r.resourceId)), [desc(resources.publishedAt)], 100);
  return rows
    .map((r) => ({ card: cards.find((c) => c.id === r.resourceId)!, lastAt: new Date(r.lastAt).toISOString(), times: r.times, versionNumber: r.versionNumber, latestVersion: r.latestVersion }))
    .filter((x) => x.card);
}

export async function getFollowing(userId: string) {
  const db = await getDb();
  const creators = await db
    .select({ id: profiles.id, username: profiles.username, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl, isVerified: profiles.isVerified })
    .from(follows)
    .innerJoin(profiles, eq(profiles.id, follows.creatorId))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
  const feed = creators.length ? await selectCards(inArray(resources.ownerId, creators.map((c) => c.id)), [desc(resources.publishedAt)], 24) : [];
  return { creators, feed };
}

export async function getAccountCounts(userId: string) {
  const db = await getDb();
  const [[fav], [dl], [fol]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(favorites).innerJoin(resources, and(eq(resources.id, favorites.resourceId), eq(resources.status, "published"))).where(eq(favorites.userId, userId)),
    db.select({ n: sql<number>`count(distinct ${downloads.resourceId})::int` }).from(downloads).where(eq(downloads.userId, userId)),
    db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followerId, userId)),
  ]);
  return { favorites: fav.n, downloads: dl.n, following: fol.n };
}


