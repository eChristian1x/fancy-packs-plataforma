"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { FormMessage, Submit } from "@/components/forms/Submit";
import f from "@/components/forms/Form.module.css";
import { requestReset, signIn, signUp, updatePassword, type FormState } from "@/lib/actions/auth";
import styles from "./Auth.module.css";

function Password({ name, label, autoComplete, help }: { name: string; label: string; autoComplete: string; help?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className={f.campo}>
      <label htmlFor={id} className={f.etiqueta}>
        {label}
      </label>
      <div className={styles.mostrar}>
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={autoComplete === "current-password" ? 1 : 8} aria-describedby={help ? `${id}-h` : undefined} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {help && (
        <p id={`${id}-h`} className={f.ayuda}>
          {help}
        </p>
      )}
    </div>
  );
}

export function LoginForm({ next, notice, devMode }: { next: string; notice?: string; devMode?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, notice ? { error: notice } : null);
  return (
    <form action={action} className={f.form} noValidate>
      <input type="hidden" name="siguiente" value={next} />
      <FormMessage state={state} />
      <div className={f.campo}>
        <label htmlFor="correo" className={f.etiqueta}>
          Correo
        </label>
        <input id="correo" name="correo" type="email" autoComplete="email" required defaultValue={state?.fields?.correo} />
      </div>
      <Password name="clave" label="Contraseña" autoComplete="current-password" />
      <Link href="/recuperar" className={styles.olvide}>
        Olvidé mi contraseña
      </Link>
      <Submit pending="Entrando…">Iniciar sesión</Submit>
      {devMode && (
        <Link href={`/dev/entrar?siguiente=${encodeURIComponent(next)}`} className="boton boton-secundario">
          Entrar en modo local (desarrollo)
        </Link>
      )}
      <p className={styles.pie}>
        <span>
          ¿No tienes cuenta? <Link href={`/registro${next !== "/cuenta" ? `?siguiente=${encodeURIComponent(next)}` : ""}`}>Crea una</Link>
        </span>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, null);
  if (state?.ok)
    return (
      <div className={f.form}>
        <FormMessage state={state} />
        <p className={f.ayuda}>
          ¿No llegó? Espera un par de minutos y revisa spam. Si ya confirmaste, <Link href="/entrar">inicia sesión</Link>.
        </p>
      </div>
    );
  return (
    <form action={action} className={f.form} noValidate>
      <FormMessage state={state} />
      <div className={f.campo}>
        <label htmlFor="usuario" className={f.etiqueta}>
          Nombre de usuario
        </label>
        <input id="usuario" name="usuario" type="text" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" defaultValue={state?.fields?.usuario} aria-describedby="usuario-h" autoCapitalize="none" spellCheck={false} />
        <p id="usuario-h" className={f.ayuda}>
          Aparece en tu perfil: fancypacks/creadores/<b>tu_usuario</b>. Minúsculas, números y _.
        </p>
      </div>
      <div className={f.campo}>
        <label htmlFor="correo" className={f.etiqueta}>
          Correo
        </label>
        <input id="correo" name="correo" type="email" autoComplete="email" required defaultValue={state?.fields?.correo} />
      </div>
      <Password name="clave" label="Contraseña" autoComplete="new-password" help="Al menos 8 caracteres, con letras y números." />
      <label className={f.casilla}>
        <input type="checkbox" name="reglas" value="si" required />
        <span>
          Acepto las <Link href="/reglas" className={f.enlace} target="_blank">reglas de publicación</Link>: solo subo contenido mío o con permiso de su autor.
        </span>
      </label>
      <Submit pending="Creando cuenta…">Crear cuenta</Submit>
      <p className={styles.pie}>
        <span>
          ¿Ya tienes cuenta? <Link href="/entrar">Inicia sesión</Link>
        </span>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<FormState, FormData>(requestReset, null);
  return (
    <form action={action} className={f.form} noValidate>
      <FormMessage state={state} />
      {!state?.ok && (
        <>
          <div className={f.campo}>
            <label htmlFor="correo" className={f.etiqueta}>
              Correo de tu cuenta
            </label>
            <input id="correo" name="correo" type="email" autoComplete="email" required defaultValue={state?.fields?.correo} />
          </div>
          <Submit pending="Enviando…">Mandar enlace</Submit>
        </>
      )}
      <p className={styles.pie}>
        <span>
          ¿Ya la recordaste? <Link href="/entrar">Inicia sesión</Link>
        </span>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, null);
  if (state?.ok)
    return (
      <div className={f.form}>
        <FormMessage state={state} />
        <Link href="/cuenta" className="boton boton-principal">
          Ir a mi cuenta
        </Link>
      </div>
    );
  return (
    <form action={action} className={f.form} noValidate>
      <FormMessage state={state} />
      <Password name="clave" label="Contraseña nueva" autoComplete="new-password" help="Al menos 8 caracteres, con letras y números." />
      <Password name="repetir" label="Repítela" autoComplete="new-password" />
      <Submit pending="Guardando…">Guardar contraseña</Submit>
    </form>
  );
}
