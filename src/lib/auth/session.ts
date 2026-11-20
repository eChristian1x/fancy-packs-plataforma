import "server-only";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { DEV_COOKIE, DEV_MODE } from "@/lib/dev";

/** Id estable para un usuario del modo local (mismo nombre → mismo id). */
export function devUserId(username: string) {
  const h = createHash("sha1").update(`fp-dev:${username}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Usuario con sesión iniciada. */
export type SessionUser = {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "creator" | "moderator" | "admin";
  isBanned: boolean;
  isVerified: boolean;
};

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const RESERVED = new Set(["admin", "administrador", "fancy", "fancypacks", "soporte", "moderador", "api", "panel", "cuenta", "entrar", "registro"]);
export const isReservedUsername = (u: string) => RESERVED.has(u.toLowerCase());

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function cleanUsername(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

/** Crea el perfil la primera vez que alguien entra (el id es el de auth.users). */
async function ensureProfile(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const db = await getDb();
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, u.id)).limit(1);
  const isAdmin = !!u.email && adminEmails().includes(u.email.toLowerCase());
  if (existing) {
    if (isAdmin && existing.role !== "admin") {
      await db.update(profiles).set({ role: "admin" }).where(eq(profiles.id, u.id));
      existing.role = "admin";
    }
    return existing;
  }
  const meta = u.user_metadata ?? {};
  let base = cleanUsername(String(meta.username ?? "")) || cleanUsername((u.email ?? "").split("@")[0]) || "jugador";
  if (base.length < 3 || isReservedUsername(base)) base = `${base}_fp`.slice(0, 20);
  let username = base;
  for (let i = 2; ; i++) {
    const [taken] = await db.select({ id: profiles.id }).from(profiles).where(sql`lower(${profiles.username}) = ${username}`).limit(1);
    if (!taken) break;
    username = `${base.slice(0, 20)}${i}`;
  }
  const displayName = String(meta.display_name ?? "").trim().slice(0, 48) || username;
  const [created] = await db
    .insert(profiles)
    .values({ id: u.id, username, displayName, role: isAdmin ? "admin" : "user" })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(profiles).where(eq(profiles.id, u.id)).limit(1))[0];
}

/** Una vez por petición. Visitantes sin cookies de sesión no hacen ninguna llamada a Supabase. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (DEV_MODE) {
    const name = (await cookies()).get(DEV_COOKIE)?.value ?? "";
    if (!USERNAME_RE.test(name)) return null;
    const p = await ensureProfile({ id: devUserId(name), email: `${name}@local.test`, user_metadata: { username: name } });
    return p ? { id: p.id, email: `${name}@local.test`, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, role: p.role, isBanned: p.isBanned, isVerified: p.isVerified } : null;
  }
  if (!AUTH_ENABLED) return null;
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const p = await ensureProfile(data.user);
  if (!p) return null;
  return {
    id: p.id,
    email: data.user.email ?? null,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    role: p.role,
    isBanned: p.isBanned,
    isVerified: p.isVerified,
  };
});

export const isStaff = (u: Pick<SessionUser, "role"> | null) => u?.role === "admin" || u?.role === "moderator";

/** Para páginas que necesitan sesión: si no hay, manda a iniciar sesión y regresa aquí. */
export async function requireUser(back: string) {
  const u = await getSessionUser();
  if (!u) redirect(`/entrar?siguiente=${encodeURIComponent(back)}`);
  return u;
}

export async function requireStaff(back: string) {
  const u = await requireUser(back);
  if (!isStaff(u)) redirect("/");
  return u;
}

export { safeNext } from "@/lib/safe-next";
