"use client";

import { useActionState } from "react";
import { FormMessage, Submit } from "@/components/forms/Submit";
import f from "@/components/forms/Form.module.css";
import { Icon } from "@/components/ui/Icon";
import { createResource } from "@/lib/actions/publish";
import type { FormState } from "@/lib/actions/auth";
import styles from "./Panel.module.css";

const TYPES = [
  { value: "texture", label: "Textura", icon: "texture", help: "Resource pack completo (.zip): espadas, armaduras, bloques…" },
  { value: "overlay", label: "Overlay", icon: "overlay", help: "Un cambio chico que se pone encima de otro pack (.zip)." },
  { value: "mod", label: "Mod", icon: "mod", help: "Archivo .jar para Fabric, Forge, NeoForge o Quilt." },
] as const;

export function StartForm() {
  const [state, action] = useActionState<FormState, FormData>(createResource, null);
  const tipo = state?.fields?.tipo ?? "texture";
  return (
    <form action={action} className={f.form}>
      <FormMessage state={state} />
      <fieldset className={f.campo}>
        <legend className={f.etiqueta}>¿Qué vas a publicar?</legend>
        <div className={styles.tipos}>
          {TYPES.map((t) => (
            <label key={t.value} className={styles.tipo}>
              <input type="radio" name="tipo" value={t.value} defaultChecked={tipo === t.value} required />
              <span className={styles.tipoCaja}>
                <Icon name={t.icon} size={22} />
                <b>{t.label}</b>
                <small>{t.help}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={f.campo}>
        <label htmlFor="nombre" className={f.etiqueta}>
          Nombre
        </label>
        <input id="nombre" name="nombre" type="text" required minLength={3} maxLength={80} defaultValue={state?.fields?.nombre} placeholder="Fresa Helada 16x" />
      </div>
      <div className={f.campo}>
        <label htmlFor="resumen" className={f.etiqueta}>
          Resumen
        </label>
        <input id="resumen" name="resumen" type="text" required minLength={10} maxLength={200} defaultValue={state?.fields?.resumen} placeholder="Espadas cortas, cielo limpio y fuego bajo. Para Sword y Crystal." aria-describedby="resumen-h" />
        <p id="resumen-h" className={f.ayuda}>
          Una línea que se ve en las tarjetas del catálogo. Después puedes escribir una descripción larga.
        </p>
      </div>
      <div className={f.acciones}>
        <Submit pending="Creando…">Crear borrador</Submit>
        <span className={f.ayuda}>Nadie lo ve hasta que lo envíes a revisión.</span>
      </div>
    </form>
  );
}
