"use client";

import { useFormStatus } from "react-dom";
import styles from "./Form.module.css";

/** Botón de envío que se desactiva y cambia de texto mientras el formulario se procesa. */
export function Submit({ children, pending, className = "boton boton-principal" }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={busy} aria-busy={busy || undefined}>
      {busy ? pending : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className={styles.error} role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className={styles.exito} role="status">
        {state.ok}
      </p>
    );
  return null;
}
