"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, Submit } from "@/components/forms/Submit";
import f from "@/components/forms/Form.module.css";
import { Icon } from "@/components/ui/Icon";
import { ImagePicker } from "@/components/upload/ImagePicker";
import type { FormState } from "@/lib/actions/auth";
import {
  addGalleryImage,
  deleteVersion,
  moveGalleryImage,
  removeGalleryImage,
  saveInfo,
  setCover,
  setIcon,
  submitForReview,
  withdrawOrDelete,
} from "@/lib/actions/publish";
import styles from "./Panel.module.css";

export type EditorData = {
  id: string;
  type: "texture" | "overlay" | "mod" | "skin" | "other";
  slug: string;
  status: string;
  name: string;
  summary: string;
  description: string;
  authorName: string;
  authorUrl: string;
  permissionNote: string;
  resolution: number | null;
  coverUrl: string | null;
  iconUrl: string | null;
  categoryIds: number[];
  categories: { id: number; name: string }[];
  gallery: { id: string; url: string }[];
  ownerDisplayName: string;
  /** Admin o moderador: "Enviar a revisión" publica directo. */
  staff: boolean;
};

/** Ejecuta una acción del servidor y refresca la página; muestra el error si lo hay. */
function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      setError("");
      setMessage("");
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "No se pudo completar.");
      if (r.message) setMessage(r.message);
      after ? after() : router.refresh();
    });
  return { pending, error, message, run };
}

export function InfoSection({ d }: { d: EditorData }) {
  const [state, action] = useActionState<FormState, FormData>(saveInfo, null);
  const [author, setAuthor] = useState(d.authorName);
  const others = author.trim() !== "" && author.trim().toLowerCase() !== d.ownerDisplayName.toLowerCase();
  return (
    <section className={f.seccion} aria-labelledby="s-info" id="informacion">
      <h2 id="s-info">Información</h2>
      <p>Lo que se lee en la página del {d.type === "mod" ? "mod" : "pack"} y en el catálogo.</p>
      <form action={action} className={f.form}>
        <input type="hidden" name="id" value={d.id} />
        <FormMessage state={state} />
        <div className={f.campo}>
          <label htmlFor="nombre" className={f.etiqueta}>Nombre</label>
          <input id="nombre" name="nombre" type="text" required minLength={3} maxLength={80} defaultValue={d.name} />
        </div>
        <div className={f.campo}>
          <label htmlFor="resumen" className={f.etiqueta}>Resumen</label>
          <input id="resumen" name="resumen" type="text" required minLength={10} maxLength={200} defaultValue={d.summary} />
        </div>
        <div className={f.campo}>
          <label htmlFor="descripcion" className={f.etiqueta}>
            Descripción <span className={f.opcional}>opcional</span>
          </label>
          <textarea id="descripcion" name="descripcion" rows={8} maxLength={10000} defaultValue={d.description} aria-describedby="descripcion-h" />
          <p id="descripcion-h" className={f.ayuda}>
            Deja una línea en blanco entre párrafos. Usa “- ” al inicio para listas, **así** para negritas y [texto](https://…) para enlaces.
          </p>
        </div>
        <fieldset className={f.campo} aria-describedby="cats-h">
          <legend className={f.etiqueta}>Categorías</legend>
          <p className={f.ayuda} id="cats-h">Elige al menos 1 (hasta 4). Sin categoría no se puede publicar.</p>
          <div className={styles.cats}>
            {d.categories.map((c) => (
              <label key={c.id} className={styles.cat}>
                <input type="checkbox" name="categoria" value={c.id} defaultChecked={d.categoryIds.includes(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {d.type !== "mod" && (
          <div className={f.campo}>
            <label htmlFor="resolucion" className={f.etiqueta}>Resolución</label>
            <select key={d.resolution ?? "x"} id="resolucion" name="resolucion" defaultValue={d.resolution ?? ""} aria-describedby="res-h">
              <option value="">Elegir…</option>
              {[8, 16, 32, 64, 128, 256, 512].map((r) => (
                <option key={r} value={r}>{r}x</option>
              ))}
            </select>
            <p id="res-h" className={f.ayuda}>Si no la eliges, la detectamos al subir el .zip.</p>
          </div>
        )}
        <div className={f.fila}>
          <div className={f.campo}>
            <label htmlFor="autor" className={f.etiqueta}>Autor</label>
            <input id="autor" name="autor" type="text" maxLength={48} value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className={f.campo}>
            <label htmlFor="autor_url" className={f.etiqueta}>Enlace del autor <span className={f.opcional}>opcional</span></label>
            <input id="autor_url" name="autor_url" type="url" placeholder="https://youtube.com/@…" defaultValue={d.authorUrl} />
          </div>
        </div>
        {others && (
          <div className={f.campo}>
            <label htmlFor="permiso" className={f.etiqueta}>¿Cómo te dio permiso {author.trim()}?</label>
            <textarea id="permiso" name="permiso" rows={2} required minLength={10} maxLength={500} defaultValue={d.permissionNote} placeholder="Me lo pasó por Discord para publicarlo aquí: https://…" />
            <p className={f.ayuda}>Solo se publica contenido de otras personas con su permiso. Esto se muestra en la página.</p>
          </div>
        )}
        <div className={f.acciones}>
          <Submit pending="Guardando…">Guardar información</Submit>
        </div>
      </form>
    </section>
  );
}

export function ImagesSection({ d, userId }: { d: EditorData; userId: string }) {
  const a = useAction();
  const isMod = d.type === "mod";
  return (
    <section className={f.seccion} aria-labelledby="s-img" id="imagenes">
      <h2 id="s-img">Imágenes</h2>
      <p>La portada sale en el catálogo. Las capturas, en la galería de la página.</p>
      {a.error && <p className={f.error} role="alert">{a.error}</p>}
      <div className={styles.portada}>
        <div className={styles.portadaImg}>
          {d.coverUrl ? <img src={d.coverUrl} alt="Portada actual" /> : <p>Sin portada</p>}
        </div>
        <div className={f.campo}>
          <span className={f.etiqueta}>Portada</span>
          <ImagePicker userId={userId} max={1280} label={d.coverUrl ? "Cambiar portada" : "Subir portada"} help="Horizontal (16:10). PNG o JPG; se convierte a WebP." onUploaded={(p) => a.run(() => setCover(d.id, p))} />
        </div>
      </div>
      {isMod && (
        <div className={styles.portada}>
          <div className={styles.portadaImg} style={{ aspectRatio: "1", width: 96 }}>
            {d.iconUrl ? <img src={d.iconUrl} alt="Ícono actual" style={{ imageRendering: "pixelated" }} /> : <p>Sin ícono</p>}
          </div>
          <div className={f.campo}>
            <span className={f.etiqueta}>Ícono del mod</span>
            <ImagePicker userId={userId} max={256} pixelated label={d.iconUrl ? "Cambiar ícono" : "Subir ícono"} help="Cuadrado. Se ve junto al nombre." onUploaded={(p) => a.run(() => setIcon(d.id, p))} />
          </div>
        </div>
      )}
      <div className={f.campo}>
        <span className={f.etiqueta}>Capturas <span className={f.opcional}>{d.gallery.length} de 8</span></span>
        {d.gallery.length > 0 && (
          <ul className={styles.galeria}>
            {d.gallery.map((g, i) => (
              <li key={g.id}>
                <img src={g.url} alt={`Captura ${i + 1}`} loading="lazy" />
                <div className={styles.miniAcciones}>
                  <button type="button" disabled={i === 0 || a.pending} onClick={() => a.run(() => moveGalleryImage(d.id, g.id, -1))} aria-label={`Mover captura ${i + 1} a la izquierda`}>←</button>
                  <button type="button" disabled={i === d.gallery.length - 1 || a.pending} onClick={() => a.run(() => moveGalleryImage(d.id, g.id, 1))} aria-label={`Mover captura ${i + 1} a la derecha`}>→</button>
                  <button type="button" disabled={a.pending} onClick={() => a.run(() => removeGalleryImage(d.id, g.id))}>Quitar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.gallery.length < 8 && (
          <ImagePicker userId={userId} max={1920} label="Agregar captura" help="Capturas del juego con el pack puesto. Hasta 8." onUploaded={(p) => a.run(() => addGalleryImage(d.id, p))} />
        )}
      </div>
    </section>
  );
}

export function VersionList({ d, versions }: { d: EditorData; versions: { id: string; versionNumber: string; channel: string; mcVersions: string[]; loaders: string[]; publishedAt: string | null; files: { fileName: string; sizeBytes: number; sha1: string }[]; dependencies: string[] }[] }) {
  const a = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!versions.length) return <p className={f.ayuda}>Todavía no subes ningún archivo.</p>;
  return (
    <>
      {a.error && <p className={f.error} role="alert">{a.error}</p>}
      <ul className={styles.versiones}>
        {versions.map((v) => (
          <li key={v.id} className={styles.version}>
            <span>
              <b className="num">{v.versionNumber}</b>{" "}
              {v.publishedAt ? (
                <span className={styles.estado} data-s="published">Publicada</span>
              ) : (
                <span className={styles.estado} data-s={d.status === "published" ? "pending" : "draft"}>
                  {d.status === "published" ? "En revisión" : "Se publica al aprobarse"}
                </span>
              )}
            </span>
            <small>
              {v.files.map((x) => `${x.fileName} · ${x.sizeBytes < 1048576 ? `${Math.max(1, Math.round(x.sizeBytes / 1024))} KB` : `${(x.sizeBytes / 1048576).toFixed(1)} MB`} · SHA-1 ${x.sha1.slice(0, 10)}…`).join(" ")}
            </small>
            <small>
              Minecraft {v.mcVersions.join(", ")}
              {v.loaders.length ? ` · ${v.loaders.join(", ")}` : ""}
              {v.dependencies.length ? ` · necesita ${v.dependencies.join(", ")}` : ""}
            </small>
            <div>
              {confirm === v.id ? (
                <span className={styles.miniAcciones}>
                  <button type="button" disabled={a.pending} onClick={() => a.run(() => deleteVersion(d.id, v.id), () => { setConfirm(null); location.reload(); })}>Sí, borrar</button>
                  <button type="button" onClick={() => setConfirm(null)}>No</button>
                </span>
              ) : (
                <button type="button" className={styles.botonPeligro} onClick={() => setConfirm(v.id)}>Borrar</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A qué sección lleva cada punto pendiente de la lista. */
const SECTION_FOR: Record<string, string> = { info: "#informacion", cat: "#informacion", res: "#informacion", cover: "#imagenes", file: "#versiones" };

export function ReviewBox({ d, checklist }: { d: EditorData; checklist: { key: string; label: string; done: boolean }[] }) {
  const a = useAction();
  const ready = checklist.every((c) => c.done);
  const canSubmit = d.status === "draft" || d.status === "rejected";
  return (
    <div className={f.seccion}>
      <h2>{canSubmit ? "Para enviar a revisión" : "Estado"}</h2>
      <ul className={styles.lista}>
        {checklist.map((c) => (
          <li key={c.key} data-ok={c.done || undefined}>
            <span className={styles.marca} aria-hidden="true">{c.done ? <Icon name="check" size={14} /> : null}</span>
            {c.done ? c.label : <a href={SECTION_FOR[c.key] ?? "#informacion"}>{c.label}</a>}
            <span className="solo-lectores">{c.done ? " (listo)" : " (falta)"}</span>
          </li>
        ))}
      </ul>
      {a.error && <p className={f.error} role="alert">{a.error}</p>}
      {a.message && <p className={f.exito} role="status">{a.message}</p>}
      {canSubmit && (
        <>
          <button type="button" className="boton boton-principal" disabled={!ready || a.pending} onClick={() => a.run(() => submitForReview(d.id))}>
            {a.pending ? (d.staff ? "Publicando…" : "Enviando…") : d.staff ? "Publicar" : "Enviar a revisión"}
          </button>
          {!ready && (
            <p className={f.ayuda} role="note">
              Para {d.staff ? "publicar" : "enviarlo"} falta: {checklist.filter((c) => !c.done).map((c) => c.label.toLowerCase()).join(", ")}. Toca cada punto de la lista para ir a su sección.
            </p>
          )}
          {ready && d.staff && <p className={f.ayuda}>Eres admin: se publica al momento, sin pasar por revisión.</p>}
        </>
      )}
      {d.status === "published" && (
        <Link href={`/${d.type === "mod" ? "mods" : d.type === "overlay" ? "overlays" : "texturas"}/${d.slug}`} className="boton boton-secundario boton-chico">
          Ver la página publicada
        </Link>
      )}
    </div>
  );
}

export function DangerZone({ d }: { d: EditorData }) {
  const router = useRouter();
  const a = useAction();
  const [confirm, setConfirm] = useState(false);
  const published = d.status === "published";
  return (
    <div className={styles.peligro}>
      <b>{published ? "Retirar publicación" : "Borrar borrador"}</b>
      <p>
        {published
          ? "Deja de verse en el catálogo y no se puede descargar. Las cifras se conservan."
          : "Se borran los datos, las imágenes y los archivos que subiste. No se puede deshacer."}
      </p>
      {a.error && <p className={f.error}>{a.error}</p>}
      {confirm ? (
        <div className={f.acciones}>
          <button type="button" className={styles.botonPeligro} disabled={a.pending} onClick={() => a.run(() => withdrawOrDelete(d.id), () => router.push("/panel"))}>
            {published ? "Sí, retirar" : "Sí, borrar"}
          </button>
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => setConfirm(false)}>Cancelar</button>
        </div>
      ) : (
        <button type="button" className={styles.botonPeligro} onClick={() => setConfirm(true)}>
          {published ? "Retirar" : "Borrar"}
        </button>
      )}
    </div>
  );
}
