import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { StartForm } from "@/components/panel/StartForm";
import styles from "@/components/panel/Panel.module.css";
import { getSessionUser } from "@/lib/auth/session";
import { DEV_MODE } from "@/lib/dev";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Publicar",
  description: "Publica tus texturas, overlays y mods de Minecraft en Fancy Packs.",
};

export default async function Page() {
  const user = await getSessionUser().catch(() => null);
  if (!user)
    return (
      <AuthLayout title="Publica en Fancy Packs" intro="Sube tus texturas, overlays y mods. Revisamos cada publicación antes de que aparezca en el catálogo.">
        <ol className={styles.pasos}>
          <li>
            <b>Crea una cuenta</b> o inicia sesión.
          </li>
          <li>
            <b>Llena los datos</b>: nombre, categorías, capturas.
          </li>
          <li>
            <b>Sube el archivo</b>. Revisamos al momento que el .zip o .jar sea válido y para qué versiones es.
          </li>
          <li>
            <b>Envíalo a revisión</b>. Un administrador lo aprueba y aparece en el catálogo.
          </li>
        </ol>
        {(AUTH_ENABLED || DEV_MODE) && (
          <div className={styles.botones}>
            <Link href="/registro" className="boton boton-principal">
              Crear cuenta
            </Link>
            <Link href="/entrar?siguiente=/publicar" className="boton boton-secundario">
              Ya tengo cuenta
            </Link>
          </div>
        )}
      </AuthLayout>
    );
  if (user.isBanned)
    return (
      <AuthLayout title="Publicar" aside={false}>
        <p>Tu cuenta está suspendida y no puede publicar. Si crees que es un error, escribe al contacto del pie de página.</p>
      </AuthLayout>
    );
  return (
    <AuthLayout title="Publicar" intro={<>Empieza con lo básico. En el siguiente paso subes capturas y el archivo. <Link href="/reglas">Reglas de publicación</Link></>} aside={false}>
      <StartForm />
    </AuthLayout>
  );
}
