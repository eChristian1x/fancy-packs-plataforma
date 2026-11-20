"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { rateResource, toggleFavorite } from "@/lib/actions/social";
import type { Viewer } from "./ResourcePage";
import styles from "./ResourceActions.module.css";

/** Favorito y valoración. Sin sesión, llevan a iniciar sesión y regresan aquí. */
export function ResourceActions({ resourceId, path, viewer }: { resourceId: string; path: string; viewer: Viewer }) {
  const router = useRouter();
  const [fav, setFav] = useState(viewer?.favorite ?? false);
  const [score, setScore] = useState(viewer?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const login = `/entrar?siguiente=${encodeURIComponent(path)}`;

  if (!viewer)
    return (
      <div className={styles.acciones}>
        <Link href={login} className="boton boton-secundario boton-chico">
          <Icon name="heart" size={16} /> Guardar en favoritos
        </Link>
        <p className={styles.ayuda}>
          <Link href={login}>Inicia sesión</Link> para guardar, valorar y comentar.
        </p>
      </div>
    );

  return (
    <div className={styles.acciones}>
      <button
        type="button"
        className={`boton boton-secundario boton-chico ${fav ? styles.activo : ""}`}
        aria-pressed={fav}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            setFav((v) => !v);
            const r = await toggleFavorite(resourceId);
            if (!r.ok) {
              setFav((v) => !v);
              setError(r.error);
            } else router.refresh();
          })
        }
      >
        <Icon name="heart" size={16} /> {fav ? "En tus favoritos" : "Guardar en favoritos"}
      </button>

      {!viewer.canEdit && (
        <fieldset className={styles.valorar} disabled={pending || viewer.isBanned}>
          <legend>{score ? "Tu valoración" : "Valorar"}</legend>
          <div className={styles.estrellas} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} de 5`}
                aria-pressed={score === n}
                data-on={(hover || score) >= n || undefined}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                onClick={() =>
                  start(async () => {
                    setError("");
                    const prev = score;
                    setScore(n);
                    const r = await rateResource(resourceId, n);
                    if (!r.ok) {
                      setScore(prev);
                      setError(r.error);
                    } else router.refresh();
                  })
                }
              >
                ★
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
