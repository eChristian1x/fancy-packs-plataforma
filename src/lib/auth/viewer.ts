import "server-only";
import { and, eq } from "drizzle-orm";
import type { Viewer } from "@/components/resource/ResourcePage";
import { getDb } from "@/lib/db/client";
import { favorites, ratings } from "@/lib/db/schema";
import type { ResourceDetail } from "@/lib/queries/detail";
import { getSessionUser } from "./session";

/** Lo que el visitante con sesión ya hizo en este recurso (favorito, valoración) y lo que puede hacer. */
export async function getViewer(r: Pick<ResourceDetail, "id" | "owner">): Promise<Viewer> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return null;
  const db = await getDb();
  const [fav, rating] = await Promise.all([
    db.select({ x: favorites.userId }).from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.resourceId, r.id))).limit(1),
    db.select({ s: ratings.score }).from(ratings).where(and(eq(ratings.userId, user.id), eq(ratings.resourceId, r.id))).limit(1),
  ]);
  const staff = user.role === "admin" || user.role === "moderator";
  return { id: user.id, favorite: fav.length > 0, rating: rating[0]?.s ?? null, canEdit: user.id === r.owner.id || staff, isBanned: user.isBanned, staff };
}
