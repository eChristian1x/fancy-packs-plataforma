/** Configuración pública de Supabase (sirve en el servidor y en el navegador). */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Sin estas variables el sitio funciona igual, pero sin cuentas ni subidas. */
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
