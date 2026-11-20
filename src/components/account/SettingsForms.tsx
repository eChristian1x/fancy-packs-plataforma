"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, Submit } from "@/components/forms/Submit";
import f from "@/components/forms/Form.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { ImagePicker } from "@/components/upload/ImagePicker";
import { updateEmail, type FormState } from "@/lib/actions/auth";
import { saveProfile, setAvatar } from "@/lib/actions/profile";
import type { SocialLink } from "@/lib/db/schema";
import styles from "./Settings.module.css";

export function ProfileForm({ user }: { user: { id: string; username: string; displayName: string; bio: string | null; avatarUrl: string | null; socials: SocialLink[] } }) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(saveProfile, null);
  const [avatarError, setAvatarError] = useState("");
  const [pending, start] = useTransition();
  const socials = [...user.socials, ...Array(5).fill({ label: "", url: "" })].slice(0, 5) as SocialLink[];
  return (
    <section className={f.seccion} aria-labelledby="perfil">
      <h2 id="perfil">Perfil público</h2>
      <p>Lo que ve cualquiera en tu página de creador.</p>
      <div className={styles.avatar}>
        <Avatar seed={user.username} src={user.avatarUrl} size={88} />
        <div className={styles.avatarAcciones}>
          <ImagePicker
            userId={user.id}
            max={256}
            label={user.avatarUrl ? "Cambiar foto" : "Subir foto"}
            help="Cuadrada, PNG o JPG. Se reduce a 256 px."
            onUploaded={async (path) => {
              const r = await setAvatar(path);
              if (!r.ok) setAvatarError(r.error ?? "No se pudo guardar.");
              else router.refresh();
            }}
          />
          {user.avatarUrl && (
            <button
              type="button"
              className={styles.quitar}
              disabled={pending}
              onClick={() => start(async () => { await setAvatar(null); router.refresh(); })}
            >
              Quitar foto y usar el avatar pixel
            </button>
          )}
          {avatarError && <p className={f.error}>{avatarError}</p>}
        </div>
      </div>
      <form action={action} className={f.form}>
        <FormMessage state={state} />
        <div className={f.fila}>
          <div className={f.campo}>
            <label htmlFor="nombre" className={f.etiqueta}>
              Nombre que se muestra
            </label>
            <input id="nombre" name="nombre" type="text" required maxLength={48} defaultValue={user.displayName} />
          </div>
          <div className={f.campo}>
            <label htmlFor="usuario" className={f.etiqueta}>
              Usuario
            </label>
            <input id="usuario" name="usuario" type="text" required pattern="[a-z0-9_]{3,24}" maxLength={24} defaultValue={user.username} autoCapitalize="none" spellCheck={false} aria-describedby="usuario-h" />
            <p id="usuario-h" className={f.ayuda}>
              Si lo cambias, cambia la dirección de tu perfil.
            </p>
          </div>
        </div>
        <div className={f.campo}>
          <label htmlFor="bio" className={f.etiqueta}>
            Sobre ti <span className={f.opcional}>opcional</span>
          </label>
          <textarea id="bio" name="bio" maxLength={500} rows={3} defaultValue={user.bio ?? ""} placeholder="Qué tipo de packs haces, en qué modalidades juegas…" />
        </div>
        <fieldset className={f.campo}>
          <legend className={f.etiqueta}>
            Redes y enlaces <span className={f.opcional}>hasta 5</span>
          </legend>
          <div className={styles.redes}>
            {socials.map((s, i) => (
              <div key={i} className={styles.red}>
                <input name={`red_${i}`} type="text" placeholder="YouTube" defaultValue={s.label} maxLength={24} aria-label={`Nombre del enlace ${i + 1}`} />
                <input name={`url_${i}`} type="url" placeholder="https://…" defaultValue={s.url} aria-label={`Dirección del enlace ${i + 1}`} />
              </div>
            ))}
          </div>
        </fieldset>
        <div className={f.acciones}>
          <Submit pending="Guardando…">Guardar perfil</Submit>
        </div>
      </form>
    </section>
  );
}

export function EmailForm({ email }: { email: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(updateEmail, null);
  return (
    <section className={f.seccion} aria-labelledby="correo-t">
      <h2 id="correo-t">Correo</h2>
      <p>Ahora: {email ?? "sin correo"}. Nadie más lo ve.</p>
      <form action={action} className={f.form}>
        <FormMessage state={state} />
        <div className={f.campo}>
          <label htmlFor="correo" className={f.etiqueta}>
            Correo nuevo
          </label>
          <input id="correo" name="correo" type="email" autoComplete="email" required defaultValue={state?.fields?.correo} />
        </div>
        <div className={f.acciones}>
          <Submit pending="Enviando…" className="boton boton-secundario">
            Cambiar correo
          </Submit>
        </div>
      </form>
    </section>
  );
}
