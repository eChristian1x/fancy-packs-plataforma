"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getSessionUser, isStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { categories, comments, profiles, reports, resources, resourceVersions } from "@/lib/db/schema";
import { publishNow, syncCompat } from "@/lib/publishing";
import { seedSampleAssets } from "@/lib/sample-assets";
import type { FormState } from "./auth";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

/** Toda acción de administración pasa por aquí: sesión + rol del equipo (o administrador). */
async function staff(adminOnly = false) {
  const user = await getSessionUser();
  if (!user || !isStaff(user) || user.isBanned) return null;
  if (adminOnly && user.role !== "admin") return null;
  return user;
}
const DENIED: Result = { ok: false, error: "No tienes permiso para hacer esto." };

// ------------------------------------------------------------------ revisión

export async function approveResource(id: string): Promise<Result> {
  if (!(await staff())) return DENIED;
  if (!isUuid(id)) return { ok: false, error: "Publicación no válida." };
  const db = await getDb();
  const [r] = await db.select({ status: resources.status }).from(resources).where(eq(resources.id, id)).limit(1);
  if (!r) return { ok: false, error: "Ya no existe." };
  await publishNow(id);
  return { ok: true, message: "Publicado." };
}

export async function rejectResource(id: string, reason: string): Promise<Result> {
  if (!(await staff())) return DENIED;
  const why = String(reason ?? "").trim().slice(0, 1000);
  if (!isUuid(id)) return { ok: false, error: "Publicación no válida." };
  if (why.length < 5) return { ok: false, error: "Escribe el motivo para que el creador sepa qué corregir." };
  const db = await getDb();
  await db.update(resources).set({ status: "rejected", rejectionReason: why, updatedAt: sql`now()` }).where(and(eq(resources.id, id), eq(resources.status, "pending")));
  updateTag("resources");
  return { ok: true, message: "Rechazado. El creador ve el motivo en su panel." };
}

export async function approveVersion(versionId: string): Promise<Result> {
  if (!(await staff())) return DENIED;
  if (!isUuid(versionId)) return { ok: false, error: "Versión no válida." };
  const db = await getDb();
  const [v] = await db
    .update(resourceVersions)
    .set({ publishedAt: sql`now()` })
    .where(and(eq(resourceVersions.id, versionId), isNull(resourceVersions.publishedAt)))
    .returning({ resourceId: resourceVersions.resourceId });
  if (!v) return { ok: false, error: "Esa versión ya se revisó." };
  await syncCompat(v.resourceId, true);
  await db.update(resources).set({ updatedAt: sql`now()` }).where(eq(resources.id, v.resourceId));
  updateTag("resources");
  return { ok: true, message: "Versión publicada." };
}

export async function rejectVersion(versionId: string): Promise<Result> {
  if (!(await staff())) return DENIED;
  if (!isUuid(versionId)) return { ok: false, error: "Versión no válida." };
  const db = await getDb();
  // Se borra la versión: el archivo queda en Storage del creador, que puede borrarlo o subir otra.
  const [v] = await db.delete(resourceVersions).where(and(eq(resourceVersions.id, versionId), isNull(resourceVersions.publishedAt))).returning({ resourceId: resourceVersions.resourceId });
  if (v) await syncCompat(v.resourceId, true);
  updateTag("resources");
  return { ok: true, message: "Versión descartada." };
}

// ------------------------------------------------------------------ publicaciones

export async function setFeatured(id: string, featured: boolean): Promise<Result> {
  if (!(await staff())) return DENIED;
  if (!isUuid(id)) return { ok: false, error: "Publicación no válida." };
  const db = await getDb();
  await db.update(resources).set({ featured }).where(eq(resources.id, id));
  updateTag("resources");
  return { ok: true };
}

export async function setResourceStatus(id: string, status: "published" | "removed", reason?: string): Promise<Result> {
  if (!(await staff())) return DENIED;
  if (!isUuid(id) || !["published", "removed"].includes(status)) return { ok: false, error: "Datos no válidos." };
  const db = await getDb();
  if (status === "published") await publishNow(id);
  else await db.update(resources).set({ status: "removed", rejectionReason: String(reason ?? "").slice(0, 1000) || "Retirado por un administrador.", updatedAt: sql`now()` }).where(eq(resources.id, id));
  updateTag("resources");
  return { ok: true };
}

// ------------------------------------------------------------------ usuarios

export async function setBanned(userId: string, banned: boolean): Promise<Result> {
  const me = await staff();
  if (!me) return DENIED;
  if (!isUuid(userId) || userId === me.id) return { ok: false, error: "No puedes suspender tu propia cuenta." };
  const db = await getDb();
  const [target] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!target) return { ok: false, error: "Ese usuario no existe." };
  if (target.role === "admin" && me.role !== "admin") return DENIED;
  await db.update(profiles).set({ isBanned: banned }).where(eq(profiles.id, userId));
  if (banned) {
    // Sus publicaciones dejan de verse y sus comentarios se ocultan.
    await db.update(resources).set({ status: "removed", rejectionReason: "Cuenta suspendida." }).where(and(eq(resources.ownerId, userId), inArray(resources.status, ["published", "pending"])));
    await db.update(comments).set({ status: "removed" }).where(and(eq(comments.userId, userId), eq(comments.status, "visible")));
  }
  updateTag("resources");
  updateTag("creators");
  return { ok: true, message: banned ? "Cuenta suspendida y sus publicaciones retiradas." : "Suspensión quitada. Sus publicaciones siguen retiradas; vuelve a publicarlas desde Publicaciones si corresponde." };
}

export async function setVerified(userId: string, verified: boolean): Promise<Result> {
  if (!(await staff())) return DENIED;
  if (!isUuid(userId)) return { ok: false, error: "Usuario no válido." };
  const db = await getDb();
  await db.update(profiles).set({ isVerified: verified }).where(eq(profiles.id, userId));
  updateTag("creators");
  updateTag("resources");
  return { ok: true };
}

export async function setRole(userId: string, role: string): Promise<Result> {
  const me = await staff(true);
  if (!me) return { ok: false, error: "Solo un administrador puede cambiar roles." };
  if (!isUuid(userId) || !["user", "creator", "moderator", "admin"].includes(role)) return { ok: false, error: "Datos no válidos." };
  if (userId === me.id && role !== "admin") return { ok: false, error: "No puedes quitarte el rol de administrador a ti mismo." };
  const db = await getDb();
  await db.update(profiles).set({ role: role as "user" }).where(eq(profiles.id, userId));
  return { ok: true };
}

// ------------------------------------------------------------------ categorías

export async function saveCategory(_: FormState, form: FormData): Promise<FormState> {
  if (!(await staff(true))) return { error: "Solo un administrador puede editar categorías." };
  const id = Number(form.get("id") || 0);
  const type = String(form.get("tipo") ?? "");
  const name = String(form.get("nombre") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const description = String(form.get("descripcion") ?? "").trim().slice(0, 300);
  const icon = String(form.get("icono") ?? "").trim().slice(0, 32);
  const sortOrder = Number(form.get("orden") || 0);
  if (!["texture", "overlay", "mod"].includes(type)) return { error: "Tipo no válido." };
  if (name.length < 2 || name.length > 48) return { error: "El nombre debe tener entre 2 y 48 caracteres." };
  if (!/^[a-z0-9-]{2,48}$/.test(slug)) return { error: "El identificador solo puede tener minúsculas, números y guiones." };
  const db = await getDb();
  const [dup] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.type, type as "texture"), eq(categories.slug, slug))).limit(1);
  if (dup && dup.id !== id) return { error: "Ya hay una categoría con ese identificador." };
  const values = { type: type as "texture", name, slug, description: description || null, icon: icon || null, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 };
  if (id) await db.update(categories).set(values).where(eq(categories.id, id));
  else await db.insert(categories).values(values);
  updateTag("resources");
  return { ok: id ? "Categoría guardada." : "Categoría creada." };
}

export async function deleteCategory(id: number): Promise<Result> {
  if (!(await staff(true))) return DENIED;
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(sql`resource_categories`).where(sql`category_id = ${id}`);
  if (n > 0) return { ok: false, error: `Tiene ${n} publicaciones. Quítalas de la categoría antes de borrarla.` };
  await db.delete(categories).where(eq(categories.id, id));
  updateTag("resources");
  return { ok: true };
}

// ------------------------------------------------------------------ reportes

export async function resolveReport(id: string, action: "dismiss" | "remove"): Promise<Result> {
  const me = await staff();
  if (!me) return DENIED;
  if (!isUuid(id)) return { ok: false, error: "Reporte no válido." };
  const db = await getDb();
  const [r] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!r) return { ok: false, error: "Ese reporte ya no existe." };
  if (action === "remove") {
    if (r.targetType === "resource")
      await db.update(resources).set({ status: "removed", rejectionReason: `Retirado por un reporte: ${r.reason}.`, updatedAt: sql`now()` }).where(eq(resources.id, r.targetId));
    if (r.targetType === "comment") await db.update(comments).set({ status: "removed" }).where(eq(comments.id, r.targetId));
  }
  // Se cierran todos los reportes abiertos sobre lo mismo
  await db
    .update(reports)
    .set({ status: action === "remove" ? "resolved" : "dismissed", resolvedBy: me.id, resolvedAt: sql`now()` })
    .where(and(eq(reports.targetId, r.targetId), eq(reports.status, "open")));
  updateTag("resources");
  return { ok: true, message: action === "remove" ? "Contenido retirado y reporte cerrado." : "Reporte descartado." };
}

// ------------------------------------------------------------------ contenido de ejemplo

export async function loadSampleAssets(): Promise<Result> {
  if (!(await staff(true))) return DENIED;
  const db = await getDb();
  const n = await seedSampleAssets(db);
  updateTag("resources");
  return { ok: true, message: n ? `Galerías y archivos cargados en ${n} publicaciones de ejemplo.` : "No hay publicaciones de ejemplo." };
}

export async function clearSamples(): Promise<Result> {
  if (!(await staff(true))) return DENIED;
  const db = await getDb();
  const r = await db.delete(resources).where(eq(resources.isSample, true)).returning({ id: resources.id });
  const p = await db.delete(profiles).where(eq(profiles.isSample, true)).returning({ id: profiles.id });
  updateTag("resources");
  updateTag("creators");
  return { ok: true, message: `Borrados ${r.length} recursos y ${p.length} perfiles de ejemplo.` };
}
