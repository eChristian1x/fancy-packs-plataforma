"use server";

import { eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getSessionUser, isReservedUsername, USERNAME_RE } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { profiles, type SocialLink } from "@/lib/db/schema";
import { BUCKET_IMAGES, publicUrl, storagePathFromUrl } from "@/lib/storage";
import { removeOwnObjects } from "@/lib/uploads-server";
import type { FormState } from "./auth";

const URL_RE = /^https:\/\/[^\s<>"']{3,300}$/i;

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Tu sesión venció. Vuelve a iniciar sesión." };
  const displayName = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const username = String(form.get("usuario") ?? "").trim().toLowerCase();
  const bio = String(form.get("bio") ?? "").trim();
  const socials: SocialLink[] = [];
  for (let i = 0; i < 5; i++) {
    const label = String(form.get(`red_${i}`) ?? "").trim().slice(0, 24);
    const url = String(form.get(`url_${i}`) ?? "").trim();
    if (!url) continue;
    if (!URL_RE.test(url)) return { error: `El enlace “${url.slice(0, 40)}” no es válido. Usa una dirección completa que empiece con https://` };
    socials.push({ label: label || new URL(url).hostname.replace(/^www\./, ""), url });
  }
  if (displayName.length < 1 || displayName.length > 48) return { error: "El nombre que se muestra debe tener entre 1 y 48 caracteres." };
  if (bio.length > 500) return { error: "La descripción puede tener hasta 500 caracteres." };
  if (!USERNAME_RE.test(username)) return { error: "El usuario debe tener de 3 a 24 caracteres: letras minúsculas, números o _." };
  const db = await getDb();
  if (username !== user.username.toLowerCase()) {
    if (isReservedUsername(username)) return { error: "Ese nombre de usuario está reservado." };
    const [taken] = await db.select({ id: profiles.id }).from(profiles).where(sql`lower(${profiles.username}) = ${username}`).limit(1);
    if (taken) return { error: "Ese nombre de usuario ya está en uso." };
  }
  await db.update(profiles).set({ displayName, username, bio: bio || null, socials, updatedAt: sql`now()` }).where(eq(profiles.id, user.id));
  updateTag("creators");
  updateTag("resources");
  return { ok: "Perfil guardado." };
}

async function removeOwnImage(url: string | null, userId: string) {
  const path = url ? storagePathFromUrl(BUCKET_IMAGES, url) : null;
  if (path?.startsWith(`${userId}/`)) await removeOwnObjects(BUCKET_IMAGES, [path]);
}

export async function setAvatar(path: string | null): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Tu sesión venció." };
  if (path !== null && (!path.startsWith(`${user.id}/`) || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(path))) return { ok: false, error: "Imagen no válida." };
  const db = await getDb();
  await removeOwnImage(user.avatarUrl, user.id);
  await db.update(profiles).set({ avatarUrl: path ? publicUrl(BUCKET_IMAGES, path) : null, updatedAt: sql`now()` }).where(eq(profiles.id, user.id));
  updateTag("creators");
  return { ok: true };
}
