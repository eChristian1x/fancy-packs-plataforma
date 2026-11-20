import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { EmailForm, ProfileForm } from "@/components/account/SettingsForms";
import { NewPasswordForm } from "@/components/auth/AuthForms";
import styles from "@/components/account/Account.module.css";
import s from "@/components/account/Settings.module.css";
import f from "@/components/forms/Form.module.css";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/actions/auth";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Ajustes de la cuenta", robots: { index: false } };

export default async function Page() {
  const user = await requireUser("/cuenta/ajustes");
  const db = await getDb();
  const [p] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return (
    <div className={`contenedor ${styles.pagina}`}>
      <header className={styles.cabeza}>
        <div className={styles.cabezaTexto}>
          <h1>Ajustes</h1>
          <p className={styles.sub}>
            <Link href="/cuenta">Volver a mi cuenta</Link>
          </p>
        </div>
      </header>
      <div className={s.columna}>
        <ProfileForm user={{ id: p.id, username: p.username, displayName: p.displayName, bio: p.bio, avatarUrl: p.avatarUrl, socials: p.socials ?? [] }} />
        <EmailForm email={user.email} />
        <section className={f.seccion} aria-labelledby="clave-t">
          <h2 id="clave-t">Contraseña</h2>
          <p>Elige una nueva. No necesitas la anterior porque ya iniciaste sesión.</p>
          <NewPasswordForm />
        </section>
        <section className={f.seccion} aria-labelledby="sesion-t">
          <h2 id="sesion-t">Sesión</h2>
          <p>Para borrar tu cuenta y tus datos, escríbele al administrador desde el contacto del pie de página.</p>
          <form action={signOut}>
            <button type="submit" className="boton boton-secundario boton-chico">
              Cerrar sesión
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
