"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./Admin.module.css";

type Result = { ok: boolean; error?: string; message?: string };

/** Botón que ejecuta una acción del servidor (ya enlazada con .bind) y refresca la página. */
export function ActionButton({
  action,
  label,
  pending = "…",
  confirm,
  tone = "normal",
}: {
  action: () => Promise<Result>;
  label: string;
  pending?: string;
  confirm?: string;
  tone?: "normal" | "principal" | "peligro";
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = () =>
    start(async () => {
      setAsk(false);
      const r = await action();
      setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error ?? "No se pudo." });
      if (r.ok) router.refresh();
    });
  return (
    <span className={styles.accion}>
      {ask ? (
        <>
          <span className={styles.pregunta}>{confirm}</span>
          <button type="button" className={styles.btn} data-tone="peligro" onClick={run} disabled={busy}>
            Sí
          </button>
          <button type="button" className={styles.btn} onClick={() => setAsk(false)}>
            No
          </button>
        </>
      ) : (
        <button type="button" className={styles.btn} data-tone={tone} disabled={busy} onClick={() => (confirm ? setAsk(true) : run())}>
          {busy ? pending : label}
        </button>
      )}
      {msg && (
        <span className={msg.ok ? styles.ok : styles.err} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </span>
      )}
    </span>
  );
}

export function RejectButton({ action, label = "Rechazar" }: { action: (reason: string) => Promise<Result>; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  if (!open)
    return (
      <button type="button" className={styles.btn} data-tone="peligro" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <span className={styles.rechazo}>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motivo (lo ve el creador): falta permiso del autor, capturas de otro pack…" aria-label="Motivo del rechazo" />
      <span className={styles.accion}>
        <button
          type="button"
          className={styles.btn}
          data-tone="peligro"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await action(reason);
              if (!r.ok) return setError(r.error ?? "No se pudo.");
              setOpen(false);
              router.refresh();
            })
          }
        >
          {busy ? "…" : "Confirmar rechazo"}
        </button>
        <button type="button" className={styles.btn} onClick={() => setOpen(false)}>
          Cancelar
        </button>
        {error && <span className={styles.err}>{error}</span>}
      </span>
    </span>
  );
}

export function RoleSelect({ action, value }: { action: (role: string) => Promise<Result>; value: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className={styles.accion}>
      <select
        className={styles.select}
        defaultValue={value}
        disabled={busy}
        aria-label="Rol"
        onChange={(e) =>
          start(async () => {
            const r = await action(e.target.value);
            if (!r.ok) setError(r.error ?? "No se pudo.");
            else router.refresh();
          })
        }
      >
        <option value="user">Usuario</option>
        <option value="creator">Creador</option>
        <option value="moderator">Moderador</option>
        <option value="admin">Administrador</option>
      </select>
      {error && <span className={styles.err}>{error}</span>}
    </span>
  );
}
