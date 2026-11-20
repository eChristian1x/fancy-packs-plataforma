"use server";

import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { DEV_COOKIE, DEV_MODE } from "@/lib/dev";
import { redirect } from "next/navigation";
import { isReservedUsername, safeNext, USERNAME_RE } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/site";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> } | null;

const OFF: FormState = { error: "Las cuentas todavía no están activadas en este sitio." };

/** Mensajes de Supabase Auth en español y sin jerga. */
function authError(e: { code?: string; message?: string; status?: number }): string {
  switch (e.code) {
    case "invalid_credentials":
      return "El correo o la contraseña no coinciden.";
    case "email_not_confirmed":
      return "Todavía no confirmas tu correo. Abre el enlace que te mandamos (revisa spam).";
    case "user_already_exists":
    case "email_exists":
      return "Ya hay una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.";
    case "email_address_invalid":
      return "Ese correo no es válido.";
    case "signup_disabled":
      return "El registro está cerrado por ahora.";
    case "same_password":
      return "La contraseña nueva tiene que ser distinta a la anterior.";
    case "email_address_not_authorized":
      return "El sitio todavía no puede mandar correos a esa dirección. Avísale al administrador.";
  }
  if (e.status === 429) return "Demasiados intentos seguidos. Espera unos minutos.";
  console.error("[auth]", e.code, e.message);
  return "No se pudo completar. Intenta de nuevo en un momento.";
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (!AUTH_ENABLED) return OFF;
  const email = str(form, "correo").toLowerCase();
  const password = String(form.get("clave") ?? "");
  if (!EMAIL_RE.test(email) || !password) return { error: "Escribe tu correo y tu contraseña.", fields: { correo: email } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authError(error), fields: { correo: email } };
  redirect(safeNext(form.get("siguiente"), "/cuenta"));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  if (!AUTH_ENABLED) return OFF;
  const username = str(form, "usuario").toLowerCase();
  const email = str(form, "correo").toLowerCase();
  const password = String(form.get("clave") ?? "");
  const fields = { usuario: username, correo: email };
  if (!USERNAME_RE.test(username)) return { error: "El usuario debe tener de 3 a 24 caracteres: letras minúsculas, números o _.", fields };
  if (isReservedUsername(username)) return { error: "Ese nombre de usuario está reservado.", fields };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido.", fields };
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return { error: "La contraseña necesita al menos 8 caracteres, con letras y números.", fields };
  if (form.get("reglas") !== "si") return { error: "Tienes que aceptar las reglas para crear la cuenta.", fields };

  const db = await getDb();
  const [taken] = await db.select({ id: profiles.id }).from(profiles).where(sql`lower(${profiles.username}) = ${username}`).limit(1);
  if (taken) return { error: "Ese nombre de usuario ya está en uso.", fields };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?siguiente=/cuenta`, data: { username, display_name: username } },
  });
  if (error) return { error: authError(error), fields };
  // Supabase no avisa si el correo ya existía (para no revelar cuentas): devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) return { error: authError({ code: "user_already_exists" }), fields };
  if (data.session) redirect("/cuenta?bienvenida=1");
  return { ok: `Listo. Te mandamos un correo a ${email} para confirmar tu cuenta. Ábrelo desde este navegador.` };
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  if (!AUTH_ENABLED) return OFF;
  const email = str(form, "correo").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido.", fields: { correo: email } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?siguiente=/cuenta/clave` });
  if (error && error.code !== "user_not_found") return { error: authError(error), fields: { correo: email } };
  return { ok: "Si hay una cuenta con ese correo, te llegará un enlace para elegir una contraseña nueva. Revisa también spam." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  if (!AUTH_ENABLED) return OFF;
  const password = String(form.get("clave") ?? "");
  const repeat = String(form.get("repetir") ?? "");
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return { error: "La contraseña necesita al menos 8 caracteres, con letras y números." };
  if (password !== repeat) return { error: "Las dos contraseñas no coinciden." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "session_not_found" || error.status === 401 ? "El enlace venció. Pide uno nuevo." : authError(error) };
  return { ok: "Contraseña actualizada." };
}

export async function updateEmail(_: FormState, form: FormData): Promise<FormState> {
  if (!AUTH_ENABLED) return OFF;
  const email = str(form, "correo").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido.", fields: { correo: email } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${SITE_URL}/auth/callback?siguiente=/cuenta/ajustes` });
  if (error) return { error: authError(error), fields: { correo: email } };
  return { ok: `Te mandamos un enlace a ${email}. El cambio se aplica cuando lo abras.` };
}

export async function devSignIn(form: FormData) {
  if (!DEV_MODE) return;
  const name = String(form.get("usuario") ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(name)) return;
  (await cookies()).set(DEV_COOKIE, name, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(safeNext(form.get("siguiente"), "/cuenta"));
}

export async function signOut() {
  if (DEV_MODE) (await cookies()).delete(DEV_COOKIE);
  if (AUTH_ENABLED) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/");
}
