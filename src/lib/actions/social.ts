"use server";

import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { comments, favorites, follows, ratings, reports, resources } from "@/lib/db/schema";
import { resourceTag } from "@/lib/queries/detail";
import { REPORT_REASONS } from "@/lib/reports";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const NEED_LOGIN: ActionResult = { ok: false, error: "Inicia sesión para hacer esto." };
const BANNED: ActionResult = { ok: false, error: "Tu cuenta está suspendida." };
const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

async function slugOf(resourceId: string) {
  const db = await getDb();
  const [r] = await db.select({ slug: resources.slug, ownerId: resources.ownerId }).from(resources).where(and(eq(resources.id, resourceId), eq(resources.status, "published"))).limit(1);
  return r ?? null;
}

export async function toggleFavorite(resourceId: string): Promise<ActionResult & { favorite?: boolean }> {
  const user = await getSessionUser();
  if (!user) return NEED_LOGIN;
  if (!isUuid(resourceId)) return { ok: false, error: "Recurso no válido." };
  const r = await slugOf(resourceId);
  if (!r) return { ok: false, error: "Ese recurso ya no existe." };
  const db = await getDb();
  const removed = await db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.resourceId, resourceId))).returning();
  if (!removed.length) await db.insert(favorites).values({ userId: user.id, resourceId }).onConflictDoNothing();
  await db
    .update(resources)
    .set({ favoriteCount: sql`(select count(*)::int from favorites f where f.resource_id = ${resourceId})` })
    .where(eq(resources.id, resourceId));
  updateTag(resourceTag(r.slug));
  return { ok: true, favorite: !removed.length };
}

export async function rateResource(resourceId: string, score: number): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return NEED_LOGIN;
  if (user.isBanned) return BANNED;
  if (!isUuid(resourceId) || !Number.isInteger(score) || score < 1 || score > 5) return { ok: false, error: "Valoración no válida." };
  const r = await slugOf(resourceId);
  if (!r) return { ok: false, error: "Ese recurso ya no existe." };
  if (r.ownerId === user.id) return { ok: false, error: "No puedes valorar tu propia publicación." };
  const db = await getDb();
  await db
    .insert(ratings)
    .values({ userId: user.id, resourceId, score })
    .onConflictDoUpdate({ target: [ratings.userId, ratings.resourceId], set: { score, createdAt: sql`now()` } });
  await db
    .update(resources)
    .set({
      ratingSum: sql`(select coalesce(sum(score), 0)::int from ratings where resource_id = ${resourceId})`,
      ratingCount: sql`(select count(*)::int from ratings where resource_id = ${resourceId})`,
    })
    .where(eq(resources.id, resourceId));
  updateTag(resourceTag(r.slug));
  return { ok: true };
}

export async function addComment(resourceId: string, body: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return NEED_LOGIN;
  if (user.isBanned) return BANNED;
  const text = (body ?? "").replace(/\r\n/g, "\n").trim();
  if (!isUuid(resourceId)) return { ok: false, error: "Recurso no válido." };
  if (text.length < 2) return { ok: false, error: "Escribe algo antes de publicar." };
  if (text.length > 2000) return { ok: false, error: "El comentario es muy largo (máximo 2000 caracteres)." };
  const r = await slugOf(resourceId);
  if (!r) return { ok: false, error: "Ese recurso ya no existe." };
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, user.id), sql`${comments.createdAt} > now() - interval '1 minute'`));
  if (n >= 3) return { ok: false, error: "Vas muy rápido. Espera un minuto antes de comentar otra vez." };
  await db.insert(comments).values({ resourceId, userId: user.id, body: text });
  updateTag(resourceTag(r.slug));
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return NEED_LOGIN;
  if (!isUuid(commentId)) return { ok: false, error: "Comentario no válido." };
  const db = await getDb();
  const [c] = await db
    .select({ userId: comments.userId, slug: resources.slug })
    .from(comments)
    .innerJoin(resources, eq(resources.id, comments.resourceId))
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!c) return { ok: false, error: "Ese comentario ya no existe." };
  const staff = user.role === "admin" || user.role === "moderator";
  if (c.userId !== user.id && !staff) return { ok: false, error: "Solo puedes borrar tus propios comentarios." };
  await db.update(comments).set({ status: c.userId === user.id ? "deleted" : "removed" }).where(eq(comments.id, commentId));
  updateTag(resourceTag(c.slug));
  return { ok: true };
}

export async function toggleFollow(creatorId: string): Promise<ActionResult & { following?: boolean }> {
  const user = await getSessionUser();
  if (!user) return NEED_LOGIN;
  if (!isUuid(creatorId)) return { ok: false, error: "Creador no válido." };
  if (creatorId === user.id) return { ok: false, error: "No puedes seguirte a ti mismo." };
  const db = await getDb();
  const removed = await db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.creatorId, creatorId))).returning();
  if (!removed.length) await db.insert(follows).values({ followerId: user.id, creatorId }).onConflictDoNothing();
  updateTag("creators");
  return { ok: true, following: !removed.length };
}


export async function submitReport(_: unknown, form: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  const targetType = String(form.get("tipo") ?? "");
  const targetId = String(form.get("id") ?? "");
  const reason = String(form.get("motivo") ?? "");
  const details = String(form.get("detalles") ?? "").trim().slice(0, 2000);
  if (!["resource", "comment", "profile"].includes(targetType) || !isUuid(targetId)) return { ok: false, error: "No sé qué estás reportando." };
  if (!(reason in REPORT_REASONS)) return { ok: false, error: "Elige un motivo." };
  if (reason === "otro" && details.length < 10) return { ok: false, error: "Cuéntanos un poco más (al menos 10 caracteres)." };
  const db = await getDb();
  if (user) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(reports)
      .where(and(eq(reports.reporterId, user.id), sql`${reports.createdAt} > now() - interval '1 hour'`));
    if (n >= 10) return { ok: false, error: "Mandaste muchos reportes en poco tiempo. Intenta más tarde." };
  }
  await db.insert(reports).values({ targetType, targetId, reporterId: user?.id ?? null, reason, details: details || null });
  return { ok: true, message: "Gracias. Un administrador va a revisar el reporte." };
}
