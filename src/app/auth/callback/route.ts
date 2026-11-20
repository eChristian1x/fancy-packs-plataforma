import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Destino de los enlaces de los correos (confirmar cuenta, recuperar contraseña, cambiar correo).
 * Acepta ?code= (flujo PKCE) o ?token_hash=&type= (plantillas con token).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("siguiente"), "/cuenta");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await supabaseServer();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const dest = ok ? (type === "recovery" ? "/cuenta/clave" : next) : `/entrar?error=enlace`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
