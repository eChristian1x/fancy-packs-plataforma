import { AUTH_ENABLED } from "./supabase/config";

/**
 * Modo local: `next dev` sin variables de Supabase. Las cuentas se simulan con un nombre de
 * usuario (sin contraseña) y los archivos se guardan en .data/storage. Sirve para desarrollar
 * y probar todo el flujo de publicar sin conexión. En producción esto es siempre `false`
 * (Next reemplaza NODE_ENV al compilar y el código se elimina).
 */
export const DEV_MODE = process.env.NODE_ENV === "development" && !AUTH_ENABLED;
export const DEV_COOKIE = "fp_dev_user";
export const DEV_STORAGE_PREFIX = "/api/dev/storage";
