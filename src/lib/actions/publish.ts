"use server";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff, type SessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  categories,
  dependencies,
  galleryImages,
  imageFeatures,
  mcVersions,
  resourceCategories,
  resourceFiles,
  resourceVersions,
  resources,
  type ResourceType,
} from "@/lib/db/schema";
import { refreshSearchText } from "@/lib/db/search";
import { checklistFor, publishNow, syncCompat } from "@/lib/publishing";
import { RESOURCE_PACK_FORMATS } from "@/lib/pack-format-table";
import { resourceTag } from "@/lib/queries/detail";
import { BUCKET_FILES, BUCKET_IMAGES, storagePathFromUrl } from "@/lib/storage";
import { fetchUploadedFile, hashes, ownsPath, processImage, removeOwnObjects } from "@/lib/uploads-server";
import { inspectMod, inspectResourcePack, RESOLUTIONS } from "@/lib/zip-inspect";
import type { FormState } from "./auth";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const TYPES: ResourceType[] = ["texture", "overlay", "mod"];
const MAX_GALLERY = 8;
const URL_RE = /^https:\/\/[^\s<>"']{3,300}$/i;
const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,31}$/;

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "pack"
  );
}

/** Carga la publicación y comprueba que el usuario sea su dueño (o del equipo). */
async function own(resourceId: unknown): Promise<{ user: SessionUser; r: typeof resources.$inferSelect } | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Tu sesión venció. Vuelve a iniciar sesión." };
  if (user.isBanned) return { error: "Tu cuenta está suspendida." };
  if (typeof resourceId !== "string" || !/^[0-9a-f-]{36}$/i.test(resourceId)) return { error: "Publicación no válida." };
  const db = await getDb();
  const [r] = await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1);
  if (!r || (r.ownerId !== user.id && !isStaff(user))) return { error: "No puedes editar esta publicación." };
  if (r.status === "removed" && !isStaff(user)) return { error: "Esta publicación fue retirada." };
  return { user, r };
}

async function touch(id: string, slug: string) {
  const db = await getDb();
  await db.update(resources).set({ updatedAt: sql`now()` }).where(eq(resources.id, id));
  updateTag(resourceTag(slug));
}

// ------------------------------------------------------------------ crear

export async function createResource(_: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Inicia sesión para publicar." };
  if (user.isBanned) return { error: "Tu cuenta está suspendida y no puede publicar." };
  const type = String(form.get("tipo") ?? "") as ResourceType;
  const name = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const summary = String(form.get("resumen") ?? "").trim().replace(/\s+/g, " ");
  const fields = { tipo: type, nombre: name, resumen: summary };
  if (!TYPES.includes(type)) return { error: "Elige qué vas a publicar.", fields };
  if (name.length < 3 || name.length > 80) return { error: "El nombre debe tener entre 3 y 80 caracteres.", fields };
  if (summary.length < 10 || summary.length > 200) return { error: "El resumen debe tener entre 10 y 200 caracteres.", fields };

  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(resources)
    .where(and(eq(resources.ownerId, user.id), inArray(resources.status, ["draft", "pending"])));
  if (n >= 10 && !isStaff(user)) return { error: "Tienes 10 publicaciones sin terminar o en revisión. Termina o borra alguna antes de crear otra.", fields };

  const base = slugify(name);
  let slug = base;
  for (let i = 2; ; i++) {
    const [taken] = await db.select({ id: resources.id }).from(resources).where(eq(resources.slug, slug)).limit(1);
    if (!taken) break;
    slug = `${base}-${i}`;
  }
  const [r] = await db
    .insert(resources)
    .values({ type, slug, name, summary, ownerId: user.id, authorName: user.displayName, status: "draft" })
    .returning({ id: resources.id });
  redirect(`/panel/recursos/${r.id}?nuevo=1`);
}

// ------------------------------------------------------------------ información

export async function saveInfo(_: FormState, form: FormData): Promise<FormState> {
  const o = await own(form.get("id"));
  if ("error" in o) return { error: o.error };
  const { r, user } = o;
  const name = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const summary = String(form.get("resumen") ?? "").trim().replace(/\s+/g, " ");
  const description = String(form.get("descripcion") ?? "").replace(/\r\n/g, "\n").trim();
  const authorName = String(form.get("autor") ?? "").trim() || user.displayName;
  const authorUrl = String(form.get("autor_url") ?? "").trim();
  const permissionNote = String(form.get("permiso") ?? "").trim();
  const catIds = form.getAll("categoria").map((v) => Number(v)).filter(Number.isInteger);
  const resolution = form.get("resolucion") ? Number(form.get("resolucion")) : null;

  if (name.length < 3 || name.length > 80) return { error: "El nombre debe tener entre 3 y 80 caracteres." };
  if (summary.length < 10 || summary.length > 200) return { error: "El resumen debe tener entre 10 y 200 caracteres." };
  if (description.length > 10000) return { error: "La descripción puede tener hasta 10 000 caracteres." };
  if (authorName.length > 48) return { error: "El nombre del autor puede tener hasta 48 caracteres." };
  if (authorUrl && !URL_RE.test(authorUrl)) return { error: "El enlace del autor debe empezar con https://" };
  const othersWork = authorName.toLowerCase() !== user.displayName.toLowerCase() && authorName.toLowerCase() !== user.username.toLowerCase();
  if (othersWork && permissionNote.length < 10)
    return { error: "Si el autor es otra persona, explica cómo te dio permiso de publicarlo (por ejemplo, un enlace a su mensaje)." };
  if (catIds.length > 4) return { error: "Elige como máximo 4 categorías." };
  if (r.type !== "mod" && resolution !== null && !RESOLUTIONS.includes(resolution as (typeof RESOLUTIONS)[number]))
    return { error: "Elige una resolución de la lista." };

  const db = await getDb();
  const valid = catIds.length
    ? await db.select({ id: categories.id }).from(categories).where(and(eq(categories.type, r.type), inArray(categories.id, catIds)))
    : [];
  await db
    .update(resources)
    .set({
      name,
      summary,
      description: description || null,
      authorName,
      authorUrl: authorUrl || null,
      permissionNote: othersWork ? permissionNote : null,
      resolution: r.type === "mod" ? null : resolution,
      updatedAt: sql`now()`,
    })
    .where(eq(resources.id, r.id));
  await db.delete(resourceCategories).where(eq(resourceCategories.resourceId, r.id));
  if (valid.length) await db.insert(resourceCategories).values(valid.map((c) => ({ resourceId: r.id, categoryId: c.id })));
  await refreshSearchText(db, [r.id]);
  updateTag(resourceTag(r.slug));
  if (r.status === "published") updateTag("resources");
  return { ok: "Cambios guardados." };
}

// ------------------------------------------------------------------ imágenes

export async function setCover(resourceId: string, path: string): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  if (!ownsPath(o.user.id, path, "image")) return { ok: false, error: "Imagen no válida." };
  try {
    const img = await processImage(path);
    const db = await getDb();
    const old = o.r.coverUrl;
    await db.update(resources).set({ coverUrl: img.url }).where(eq(resources.id, resourceId));
    if (old) await db.delete(imageFeatures).where(and(eq(imageFeatures.resourceId, resourceId), eq(imageFeatures.url, old)));
    await db.insert(imageFeatures).values({ resourceId, url: img.url, kind: "cover", vector: img.vector });
    const oldPath = old ? storagePathFromUrl(BUCKET_IMAGES, old) : null;
    if (oldPath?.startsWith(`${o.user.id}/`)) await removeOwnObjects(BUCKET_IMAGES, [oldPath]);
    await touch(resourceId, o.r.slug);
    if (o.r.status === "published") updateTag("resources");
    return { ok: true };
  } catch (e) {
    await removeOwnObjects(BUCKET_IMAGES, [path]);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar la imagen." };
  }
}

export async function setIcon(resourceId: string, path: string | null): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  if (path !== null && !ownsPath(o.user.id, path, "image")) return { ok: false, error: "Imagen no válida." };
  try {
    const img = path ? await processImage(path) : null;
    const db = await getDb();
    const old = o.r.iconUrl ? storagePathFromUrl(BUCKET_IMAGES, o.r.iconUrl) : null;
    await db.update(resources).set({ iconUrl: img?.url ?? null }).where(eq(resources.id, resourceId));
    if (old?.startsWith(`${o.user.id}/`)) await removeOwnObjects(BUCKET_IMAGES, [old]);
    await touch(resourceId, o.r.slug);
    return { ok: true };
  } catch (e) {
    if (path) await removeOwnObjects(BUCKET_IMAGES, [path]);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el ícono." };
  }
}

export async function addGalleryImage(resourceId: string, path: string): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  if (!ownsPath(o.user.id, path, "image")) return { ok: false, error: "Imagen no válida." };
  const db = await getDb();
  const [{ n, max }] = await db
    .select({ n: sql<number>`count(*)::int`, max: sql<number>`coalesce(max(${galleryImages.sortOrder}), -1)::int` })
    .from(galleryImages)
    .where(eq(galleryImages.resourceId, resourceId));
  if (n >= MAX_GALLERY) {
    await removeOwnObjects(BUCKET_IMAGES, [path]);
    return { ok: false, error: `La galería admite hasta ${MAX_GALLERY} capturas.` };
  }
  try {
    const img = await processImage(path);
    await db.insert(galleryImages).values({ resourceId, url: img.url, width: img.width, height: img.height, sortOrder: max + 1 });
    await db.insert(imageFeatures).values({ resourceId, url: img.url, kind: "gallery", vector: img.vector });
    await touch(resourceId, o.r.slug);
    return { ok: true };
  } catch (e) {
    await removeOwnObjects(BUCKET_IMAGES, [path]);
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar la captura." };
  }
}

export async function removeGalleryImage(resourceId: string, imageId: string): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  const db = await getDb();
  const [img] = await db
    .delete(galleryImages)
    .where(and(eq(galleryImages.id, imageId), eq(galleryImages.resourceId, resourceId)))
    .returning();
  if (!img) return { ok: false, error: "Esa captura ya no existe." };
  await db.delete(imageFeatures).where(and(eq(imageFeatures.resourceId, resourceId), eq(imageFeatures.url, img.url)));
  const p = storagePathFromUrl(BUCKET_IMAGES, img.url);
  if (p?.startsWith(`${o.user.id}/`)) await removeOwnObjects(BUCKET_IMAGES, [p]);
  await touch(resourceId, o.r.slug);
  return { ok: true };
}

export async function moveGalleryImage(resourceId: string, imageId: string, dir: -1 | 1): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  const db = await getDb();
  const list = await db.select({ id: galleryImages.id }).from(galleryImages).where(eq(galleryImages.resourceId, resourceId)).orderBy(galleryImages.sortOrder);
  const i = list.findIndex((x) => x.id === imageId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((x, k) => db.update(galleryImages).set({ sortOrder: k }).where(eq(galleryImages.id, x.id))));
  await touch(resourceId, o.r.slug);
  return { ok: true };
}

// ------------------------------------------------------------------ versiones y archivos

export type NewVersion = {
  resourceId: string;
  path: string;
  fileName: string;
  versionNumber: string;
  changelog: string;
  channel: string;
  mcVersions: string[];
  loaders: string[];
  /** Dependencias que escribe el creador (mods): nombre y enlace. */
  deps: { name: string; url: string; kind: string }[];
};

export async function addVersion(v: NewVersion): Promise<Result & { warnings?: string[] }> {
  const o = await own(v.resourceId);
  if ("error" in o) {
    if (typeof v.path === "string" && v.path.length < 220) {
      const u = await getSessionUser();
      if (u && ownsPath(u.id, v.path, "file")) await removeOwnObjects(BUCKET_FILES, [v.path]);
    }
    return { ok: false, error: o.error };
  }
  const { r, user } = o;
  const fail = async (error: string) => {
    await removeOwnObjects(BUCKET_FILES, [v.path]);
    return { ok: false as const, error };
  };
  if (!ownsPath(user.id, v.path, "file")) return { ok: false, error: "Archivo no válido." };
  const isMod = r.type === "mod";
  if (isMod !== v.path.toLowerCase().endsWith(".jar")) return fail(isMod ? "Un mod se sube como archivo .jar." : "Un pack se sube como archivo .zip.");
  const versionNumber = String(v.versionNumber ?? "").trim();
  if (!VERSION_RE.test(versionNumber)) return fail("El número de versión solo puede tener números, letras, puntos y guiones (por ejemplo 1.2.0).");
  const changelog = String(v.changelog ?? "").trim().slice(0, 5000);
  const channel = ["release", "beta", "alpha"].includes(v.channel) ? v.channel : "release";

  const db = await getDb();
  const [dup] = await db
    .select({ id: resourceVersions.id })
    .from(resourceVersions)
    .where(and(eq(resourceVersions.resourceId, r.id), eq(resourceVersions.versionNumber, versionNumber)))
    .limit(1);
  if (dup) return fail(`Ya existe la versión ${versionNumber}. Usa otro número.`);

  const known = new Set([...(await db.select({ id: mcVersions.id }).from(mcVersions)).map((x) => x.id), ...RESOURCE_PACK_FORMATS.map(([x]) => x)]);
  const mc = [...new Set((v.mcVersions ?? []).filter((x) => typeof x === "string" && known.has(x)))].slice(0, 80);
  if (!mc.length) return fail("Marca al menos una versión de Minecraft compatible.");

  let buf: Uint8Array;
  try {
    buf = await fetchUploadedFile(v.path);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo leer el archivo.");
  }

  // Revisión automática: la misma que ve el creador antes de subir, pero hecha aquí (no se confía en el navegador).
  let loaders: string[] = [];
  let warnings: string[] = [];
  const depRows: { externalName: string; externalUrl: string | null; kind: string }[] = [];
  if (isMod) {
    const ins = inspectMod(buf);
    if (!ins.ok) return fail(ins.errors.join(" "));
    warnings = ins.warnings;
    const chosen = (v.loaders ?? []).filter((l) => ins.loaders.includes(l as never));
    loaders = chosen.length ? chosen : ins.loaders;
    if (ins.loaders.includes("fabric") && !ins.loaders.includes("quilt") && (v.loaders ?? []).includes("quilt")) loaders.push("quilt"); // Quilt carga mods de Fabric
    for (const d of (v.deps ?? []).slice(0, 12)) {
      const name = String(d.name ?? "").trim().slice(0, 80);
      const url = String(d.url ?? "").trim();
      if (!name) continue;
      if (url && !URL_RE.test(url)) return fail(`El enlace de “${name}” debe empezar con https://`);
      depRows.push({ externalName: name, externalUrl: url || null, kind: ["required", "optional", "incompatible"].includes(d.kind) ? d.kind : "required" });
    }
  } else {
    const ins = inspectResourcePack(buf);
    if (!ins.ok) return fail(ins.errors.join(" "));
    warnings = ins.warnings;
    if (ins.resolution && !r.resolution) {
      const res = RESOLUTIONS.reduce((a, b) => (Math.abs(b - ins.resolution!) < Math.abs(a - ins.resolution!) ? b : a));
      await db.update(resources).set({ resolution: res }).where(eq(resources.id, r.id));
    }
  }

  const { sha1, sha512 } = hashes(buf);
  const fileName = (String(v.fileName ?? "").replace(/[^A-Za-z0-9._ -]/g, "_").slice(-120) || v.path.split("/").pop()!).trim();
  // Publicación ya aprobada: las versiones nuevas de creadores verificados (o del equipo) salen de inmediato;
  // las demás esperan revisión. Si la publicación no está aprobada, se publican al aprobarla.
  const immediate = r.status === "published" && (user.isVerified || isStaff(user));
  const [ver] = await db
    .insert(resourceVersions)
    .values({
      resourceId: r.id,
      versionNumber,
      changelog: changelog || null,
      channel: isMod ? channel : "release",
      mcVersions: mc,
      loaders: loaders as never,
      publishedAt: immediate ? sql`now()` : null,
    })
    .returning({ id: resourceVersions.id });
  await db.insert(resourceFiles).values({ versionId: ver.id, storagePath: v.path, fileName, sizeBytes: buf.byteLength, sha1, sha512, isPrimary: true, scanStatus: "clean" });
  if (depRows.length) await db.insert(dependencies).values(depRows.map((d) => ({ ...d, versionId: ver.id })));
  await syncCompat(r.id, r.status === "published");
  await touch(r.id, r.slug);
  if (immediate) updateTag("resources");
  return {
    ok: true,
    message: immediate ? "Versión publicada." : r.status === "published" ? "Versión subida. Se publica cuando un administrador la revise." : "Versión subida.",
    warnings,
  };
}

export async function deleteVersion(resourceId: string, versionId: string): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  const db = await getDb();
  const [ver] = await db
    .select()
    .from(resourceVersions)
    .where(and(eq(resourceVersions.id, versionId), eq(resourceVersions.resourceId, resourceId)))
    .limit(1);
  if (!ver) return { ok: false, error: "Esa versión ya no existe." };
  if (o.r.status === "published") {
    const published = await db
      .select({ id: resourceVersions.id })
      .from(resourceVersions)
      .where(and(eq(resourceVersions.resourceId, resourceId), sql`${resourceVersions.publishedAt} is not null`));
    if (ver.publishedAt && published.length <= 1) return { ok: false, error: "Es la única versión publicada. Sube otra antes de borrar esta." };
  }
  const files = await db.select({ p: resourceFiles.storagePath }).from(resourceFiles).where(eq(resourceFiles.versionId, versionId));
  await db.delete(resourceVersions).where(eq(resourceVersions.id, versionId));
  await removeOwnObjects(BUCKET_FILES, files.map((f) => f.p).filter((p) => p.startsWith(`${o.user.id}/`)));
  await syncCompat(resourceId, o.r.status === "published");
  await touch(resourceId, o.r.slug);
  if (o.r.status === "published") updateTag("resources");
  return { ok: true };
}

// ------------------------------------------------------------------ revisión

export async function submitForReview(resourceId: string): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  if (!["draft", "rejected"].includes(o.r.status)) return { ok: false, error: "Esta publicación ya está en revisión o publicada." };
  const missing = (await checklistFor(resourceId)).filter((c) => !c.done);
  if (missing.length) return { ok: false, error: `Falta: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.` };
  const db = await getDb();
  if (isStaff(o.user)) {
    await publishNow(resourceId);
    return { ok: true, message: "Publicado." };
  }
  await db.update(resources).set({ status: "pending", rejectionReason: null, updatedAt: sql`now()` }).where(eq(resources.id, resourceId));
  updateTag(resourceTag(o.r.slug));
  return { ok: true, message: "Enviado a revisión. Te avisamos aquí mismo cuando se publique." };
}

export async function withdrawOrDelete(resourceId: string): Promise<Result> {
  const o = await own(resourceId);
  if ("error" in o) return { ok: false, error: o.error };
  const db = await getDb();
  if (o.r.status === "published") {
    // Ya tiene descargas registradas: se retira (deja de verse) en lugar de borrarse.
    await db.update(resources).set({ status: "removed", updatedAt: sql`now()` }).where(eq(resources.id, resourceId));
    updateTag("resources");
    return { ok: true, message: "Publicación retirada." };
  }
  const files = await db
    .select({ p: resourceFiles.storagePath })
    .from(resourceFiles)
    .innerJoin(resourceVersions, eq(resourceVersions.id, resourceFiles.versionId))
    .where(eq(resourceVersions.resourceId, resourceId));
  const imgs = await db.select({ u: galleryImages.url }).from(galleryImages).where(eq(galleryImages.resourceId, resourceId));
  const imagePaths = [...imgs.map((i) => i.u), o.r.coverUrl, o.r.iconUrl]
    .map((u) => (u ? storagePathFromUrl(BUCKET_IMAGES, u) : null))
    .filter((p): p is string => !!p && p.startsWith(`${o.user.id}/`));
  await db.delete(resources).where(eq(resources.id, resourceId));
  await removeOwnObjects(BUCKET_FILES, files.map((f) => f.p).filter((p) => p.startsWith(`${o.user.id}/`)));
  await removeOwnObjects(BUCKET_IMAGES, imagePaths);
  return { ok: true, message: "Borrador eliminado." };
}

