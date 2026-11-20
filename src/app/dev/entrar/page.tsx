import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import f from "@/components/forms/Form.module.css";
import { devSignIn } from "@/lib/actions/auth";
import { safeNext } from "@/lib/auth/session";
import { DEV_MODE } from "@/lib/dev";

export const metadata: Metadata = { title: "Entrar (modo local)", robots: { index: false } };

/** Solo en `next dev` sin Supabase: entra con un nombre de usuario, sin contraseña. */
export default async function Page({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  if (!DEV_MODE) notFound();
  const next = safeNext((await searchParams).siguiente, "/cuenta");
  return (
    <AuthLayout title="Entrar en modo local" intro="Estás en desarrollo sin Supabase. Escribe cualquier usuario; el correo admin@local.test (usuario “admin”) es administrador." aside={false}>
      <form action={devSignIn} className={f.form}>
        <input type="hidden" name="siguiente" value={next} />
        <div className={f.campo}>
          <label htmlFor="usuario" className={f.etiqueta}>Usuario</label>
          <input id="usuario" name="usuario" type="text" required pattern="[a-z0-9_]{3,24}" defaultValue="creador_local" />
        </div>
        <button type="submit" className="boton boton-principal">Entrar</button>
      </form>
    </AuthLayout>
  );
}
