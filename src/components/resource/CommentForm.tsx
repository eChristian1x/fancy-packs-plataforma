"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "@/lib/actions/social";
import styles from "./Comments.module.css";

export function CommentForm({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");
  const [len, setLen] = useState(0);
  const [pending, start] = useTransition();
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const body = ref.current?.value ?? "";
        start(async () => {
          setError("");
          const r = await addComment(resourceId, body);
          if (!r.ok) return setError(r.error);
          if (ref.current) ref.current.value = "";
          setLen(0);
          router.refresh();
        });
      }}
    >
      <label htmlFor="comentario" className="solo-lectores">
        Tu comentario
      </label>
      <textarea
        id="comentario"
        ref={ref}
        rows={3}
        maxLength={2000}
        placeholder="¿Qué te pareció? ¿Funciona bien en tu versión?"
        onChange={(e) => setLen(e.target.value.length)}
        required
      />
      <div className={styles.formPie}>
        <span className={`${styles.cuenta} num`} aria-live="polite">
          {len > 1800 ? `${2000 - len} restantes` : ""}
        </span>
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
        <button type="submit" className="boton boton-principal boton-chico" disabled={pending}>
          {pending ? "Publicando…" : "Publicar comentario"}
        </button>
      </div>
    </form>
  );
}

export function DeleteComment({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <span className={styles.borrar}>
      ¿Borrar el comentario?{" "}
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await deleteComment(id); if (r.ok) router.refresh(); })}>
        Sí, borrar
      </button>{" "}
      <button type="button" onClick={() => setConfirm(false)}>
        No
      </button>
    </span>
  ) : (
    <button type="button" className={styles.borrar} onClick={() => setConfirm(true)}>
      Borrar
    </button>
  );
}
