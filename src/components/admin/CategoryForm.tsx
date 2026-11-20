"use client";

import { useActionState } from "react";
import { FormMessage, Submit } from "@/components/forms/Submit";
import f from "@/components/forms/Form.module.css";
import { saveCategory } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/auth";

type Cat = { id: number; type: string; slug: string; name: string; description: string | null; icon: string | null; sortOrder: number };

export function CategoryForm({ c }: { c?: Cat }) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory, null);
  return (
    <form action={action} className={f.form}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <FormMessage state={state} />
      <div className={f.fila}>
        <div className={f.campo}>
          <label className={f.etiqueta} htmlFor={`n-${c?.id ?? "nueva"}`}>Nombre</label>
          <input id={`n-${c?.id ?? "nueva"}`} name="nombre" type="text" required defaultValue={c?.name} maxLength={48} />
        </div>
        <div className={f.campo}>
          <label className={f.etiqueta} htmlFor={`s-${c?.id ?? "nueva"}`}>Identificador (URL)</label>
          <input id={`s-${c?.id ?? "nueva"}`} name="slug" type="text" required pattern="[a-z0-9-]{2,48}" defaultValue={c?.slug} />
        </div>
      </div>
      <div className={f.fila}>
        <div className={f.campo}>
          <label className={f.etiqueta} htmlFor={`t-${c?.id ?? "nueva"}`}>Tipo</label>
          <select id={`t-${c?.id ?? "nueva"}`} name="tipo" defaultValue={c?.type ?? "texture"}>
            <option value="texture">Texturas</option>
            <option value="overlay">Overlays</option>
            <option value="mod">Mods</option>
          </select>
        </div>
        <div className={f.campo}>
          <label className={f.etiqueta} htmlFor={`o-${c?.id ?? "nueva"}`}>Orden</label>
          <input id={`o-${c?.id ?? "nueva"}`} name="orden" type="number" defaultValue={c?.sortOrder ?? 0} />
        </div>
      </div>
      <div className={f.campo}>
        <label className={f.etiqueta} htmlFor={`d-${c?.id ?? "nueva"}`}>Descripción <span className={f.opcional}>se ve en la página de la categoría</span></label>
        <input id={`d-${c?.id ?? "nueva"}`} name="descripcion" type="text" defaultValue={c?.description ?? ""} maxLength={300} />
      </div>
      <div className={f.campo}>
        <label className={f.etiqueta} htmlFor={`i-${c?.id ?? "nueva"}`}>Ícono pixel <span className={f.opcional}>clave de PixelIcon (sword, crystal…)</span></label>
        <input id={`i-${c?.id ?? "nueva"}`} name="icono" type="text" defaultValue={c?.icon ?? ""} maxLength={32} />
      </div>
      <Submit pending="Guardando…" className="boton boton-principal boton-chico">{c ? "Guardar" : "Crear categoría"}</Submit>
    </form>
  );
}
