"use client";

import { useActionState } from "react";
import { FormMessage, Submit } from "@/components/forms/Submit";
import f from "@/components/forms/Form.module.css";
import { submitReport, type ActionResult } from "@/lib/actions/social";
import { REPORT_REASONS } from "@/lib/reports";

export function ReportForm({ type, id }: { type: "resource" | "comment" | "profile"; id: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(submitReport, null);
  const view = state ? (state.ok ? { ok: state.message } : { error: state.error }) : null;
  if (state?.ok) return <FormMessage state={view} />;
  return (
    <form action={action} className={f.form}>
      <input type="hidden" name="tipo" value={type} />
      <input type="hidden" name="id" value={id} />
      <FormMessage state={view} />
      <fieldset className={f.campo}>
        <legend className={f.etiqueta}>¿Qué pasa?</legend>
        {Object.entries(REPORT_REASONS).map(([k, label]) => (
          <label key={k} className={f.casilla}>
            <input type="radio" name="motivo" value={k} required />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className={f.campo}>
        <label htmlFor="detalles" className={f.etiqueta}>
          Detalles <span className={f.opcional}>ayuda mucho un enlace o una prueba</span>
        </label>
        <textarea id="detalles" name="detalles" rows={4} maxLength={2000} />
      </div>
      <div className={f.acciones}>
        <Submit pending="Enviando…">Enviar reporte</Submit>
      </div>
    </form>
  );
}
