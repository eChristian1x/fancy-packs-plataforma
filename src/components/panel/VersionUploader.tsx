"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import f from "@/components/forms/Form.module.css";
import u from "@/components/upload/Upload.module.css";
import { addVersion } from "@/lib/actions/publish";
import { uploadToStorage } from "@/lib/upload-client";
import { inRange } from "@/lib/version-range";
import { sortVersions } from "@/lib/versions";
import { inspectMod, inspectResourcePack, MAX_UPLOAD_BYTES, type ModInspection, type PackInspection } from "@/lib/zip-inspect";
import styles from "./Panel.module.css";

type Props = {
  resourceId: string;
  userId: string;
  isMod: boolean;
  suggestedVersion: string;
  /** Versiones de Minecraft de la tabla, de la más nueva a la más vieja; `featured` = las que se usan en filtros. */
  mcList: { id: string; featured: boolean }[];
};

const LOADER_LABEL: Record<string, string> = { fabric: "Fabric", forge: "Forge", neoforge: "NeoForge", quilt: "Quilt" };
const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/**
 * Subir una versión: el archivo se revisa en el navegador (al instante, sin subirlo),
 * el creador confirma versiones y notas, y al subir el servidor lo vuelve a revisar.
 */
export function VersionUploader({ resourceId, userId, isMod, suggestedVersion, mcList }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [inspection, setInspection] = useState<PackInspection | ModInspection | null>(null);
  const [mc, setMc] = useState<string[]>([]);
  const [loaders, setLoaders] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [deps, setDeps] = useState<{ name: string; url: string; kind: string }[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ message: string; warnings: string[] } | null>(null);

  const ext = isMod ? ".jar" : ".zip";
  const featured = mcList.filter((v) => v.featured).map((v) => v.id);

  async function pick(fl: File) {
    setError("");
    setDone(null);
    setInspection(null);
    if (!fl.name.toLowerCase().endsWith(ext)) return setError(`Elige un archivo ${ext}.`);
    if (fl.size > MAX_UPLOAD_BYTES) return setError(`El archivo pesa ${mb(fl.size)}; el máximo es 50 MB.`);
    setFile(fl);
    const data = new Uint8Array(await fl.arrayBuffer());
    if (isMod) {
      const ins = inspectMod(data);
      setInspection(ins);
      setLoaders(ins.loaders);
      const matched = ins.mcRange ? mcList.filter((v) => inRange(v.id, ins.mcRange)).map((v) => v.id) : [];
      setMc(matched.length ? matched.filter((v) => featured.includes(v) || matched.length <= 6) : []);
      setDeps(ins.dependencies.filter((d) => d.kind === "required").map((d) => ({ name: d.id === "fabric-api" ? "Fabric API" : d.id, url: d.id === "fabric-api" ? "https://modrinth.com/mod/fabric-api" : "", kind: "required" })));
    } else {
      const ins = inspectResourcePack(data);
      setInspection(ins);
      // Por omisión: las versiones detectadas que aparecen en los filtros; si ninguna, la más nueva detectada.
      const pre = ins.versions.filter((v) => featured.includes(v));
      setMc(pre.length ? pre : ins.versions.slice(-1));
    }
  }

  // Versiones para elegir: las de la tabla + las detectadas en el archivo
  const choices = useMemo(() => {
    const detected = inspection && "versions" in inspection ? inspection.versions : [];
    const all = sortVersions([...new Set([...mcList.map((v) => v.id), ...detected])]).reverse();
    const main = all.filter((v) => featured.includes(v) || mc.includes(v) || detected.includes(v));
    return showAll ? all : main.length ? main : all.slice(0, 16);
  }, [inspection, mcList, featured, mc, showAll]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !inspection?.ok) return;
    const form = new FormData(e.currentTarget);
    setError("");
    try {
      setProgress(0);
      const path = await uploadToStorage("archivos", userId, file, file.name, setProgress);
      setProgress(100);
      const r = await addVersion({
        resourceId,
        path,
        fileName: file.name,
        versionNumber: String(form.get("version") ?? ""),
        changelog: String(form.get("cambios") ?? ""),
        channel: String(form.get("canal") ?? "release"),
        mcVersions: mc,
        loaders,
        deps: deps.filter((d) => d.name.trim()),
      });
      if (!r.ok) throw new Error(r.error);
      setDone({ message: r.message ?? "Versión subida.", warnings: r.warnings ?? [] });
      setFile(null);
      setInspection(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir.");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  const pack = inspection && !isMod ? (inspection as PackInspection) : null;
  const mod = inspection && isMod ? (inspection as ModInspection) : null;

  return (
    <div className={f.form}>
      {done && (
        <div className={f.exito} role="status">
          <span>
            {done.message}
            {done.warnings.length > 0 && <> Avisos: {done.warnings.join(" ")}</>}
          </span>
        </div>
      )}
      {!file || !inspection ? (
        <label
          className={u.soltar}
          data-over={over || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const fl = e.dataTransfer.files[0];
            if (fl) pick(fl);
          }}
        >
          <input ref={input} type="file" accept={isMod ? ".jar,application/java-archive" : ".zip,application/zip"} className="solo-lectores" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <b>Arrastra tu {ext} aquí o haz clic para elegirlo</b>
          <small>Hasta 50 MB. Lo revisamos antes de subirlo.</small>
        </label>
      ) : (
        <form onSubmit={submit} className={f.form}>
          <div className={styles.detectado}>
            <b>{file.name}</b>
            <dl>
              <dt>Tamaño</dt>
              <dd>{mb(file.size)}</dd>
              {pack && (
                <>
                  <dt>pack_format</dt>
                  <dd>
                    {pack.meta?.min !== pack.meta?.max ? `${pack.meta?.min} a ${pack.meta?.max}` : pack.meta?.packFormat ?? "?"}
                    {pack.versions.length > 0 && ` (Minecraft ${pack.versions[0]} – ${pack.versions[pack.versions.length - 1]})`}
                  </dd>
                  <dt>Texturas</dt>
                  <dd>{pack.textures}</dd>
                  {pack.resolution && (
                    <>
                      <dt>Resolución</dt>
                      <dd>{pack.resolution}x</dd>
                    </>
                  )}
                  {pack.meta?.description && (
                    <>
                      <dt>Descripción</dt>
                      <dd>{pack.meta.description}</dd>
                    </>
                  )}
                </>
              )}
              {mod && (
                <>
                  <dt>Mod</dt>
                  <dd>
                    {mod.name ?? mod.modId ?? "?"} {mod.version && `· ${mod.version}`}
                  </dd>
                  <dt>Loaders</dt>
                  <dd>{mod.loaders.map((l) => LOADER_LABEL[l]).join(", ") || "—"}</dd>
                  {mod.mcRange && (
                    <>
                      <dt>Minecraft</dt>
                      <dd>{mod.mcRange}</dd>
                    </>
                  )}
                </>
              )}
            </dl>
            {inspection.errors.length > 0 && (
              <p className={f.error} role="alert">
                {inspection.errors.join(" ")}
              </p>
            )}
            {inspection.warnings.length > 0 && (
              <ul className={styles.advertencias}>
                {inspection.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <button type="button" className={styles.botonPeligro} onClick={() => { setFile(null); setInspection(null); }} disabled={busy}>
              Elegir otro archivo
            </button>
          </div>

          {inspection.ok && (
            <>
              <div className={f.fila}>
                <div className={f.campo}>
                  <label htmlFor="version" className={f.etiqueta}>Número de versión</label>
                  <input id="version" name="version" type="text" required pattern="[0-9A-Za-z][0-9A-Za-z.+_\-]{0,31}" defaultValue={mod?.version && !mod.version.includes("$") ? mod.version : suggestedVersion} />
                </div>
                {isMod && (
                  <div className={f.campo}>
                    <label htmlFor="canal" className={f.etiqueta}>Tipo</label>
                    <select id="canal" name="canal" defaultValue="release">
                      <option value="release">Estable</option>
                      <option value="beta">Beta</option>
                      <option value="alpha">Alfa</option>
                    </select>
                  </div>
                )}
              </div>

              <fieldset className={f.campo}>
                <legend className={f.etiqueta}>Versiones de Minecraft compatibles</legend>
                <div className={styles.mcs}>
                  {choices.map((v) => (
                    <label key={v} className={styles.mc}>
                      <input type="checkbox" checked={mc.includes(v)} onChange={() => setMc((x) => (x.includes(v) ? x.filter((y) => y !== v) : [...x, v]))} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
                <p className={f.ayuda}>
                  Marcamos las que dice el archivo. {mc.length} elegidas.{" "}
                  <button type="button" className={f.enlace} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => setShowAll((x) => !x)}>
                    {showAll ? "Mostrar menos" : "Mostrar todas las versiones"}
                  </button>
                </p>
              </fieldset>

              {isMod && mod && (
                <>
                  <fieldset className={f.campo}>
                    <legend className={f.etiqueta}>Loaders</legend>
                    <div className={styles.mcs}>
                      {[...new Set([...mod.loaders, ...(mod.loaders.includes("fabric") ? ["quilt"] : [])])].map((l) => (
                        <label key={l} className={styles.mc}>
                          <input type="checkbox" checked={loaders.includes(l)} onChange={() => setLoaders((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))} />
                          <span>{LOADER_LABEL[l]}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className={f.campo}>
                    <legend className={f.etiqueta}>Dependencias <span className={f.opcional}>otros mods que hacen falta</span></legend>
                    {deps.map((d, i) => (
                      <div key={i} className={f.fila}>
                        <input type="text" value={d.name} placeholder="Fabric API" aria-label={`Nombre de la dependencia ${i + 1}`} onChange={(e) => setDeps((x) => x.map((y, k) => (k === i ? { ...y, name: e.target.value } : y)))} />
                        <input type="url" value={d.url} placeholder="https://modrinth.com/mod/…" aria-label={`Enlace de la dependencia ${i + 1}`} onChange={(e) => setDeps((x) => x.map((y, k) => (k === i ? { ...y, url: e.target.value } : y)))} />
                      </div>
                    ))}
                    <button type="button" className="boton boton-secundario boton-chico" style={{ justifySelf: "start" }} onClick={() => setDeps((x) => [...x, { name: "", url: "", kind: "required" }])}>
                      Agregar dependencia
                    </button>
                  </fieldset>
                </>
              )}

              <div className={f.campo}>
                <label htmlFor="cambios" className={f.etiqueta}>Cambios <span className={f.opcional}>opcional</span></label>
                <textarea id="cambios" name="cambios" rows={3} maxLength={5000} placeholder="- Espada más corta&#10;- Cielo sin nubes" />
              </div>

              {error && <p className={f.error} role="alert">{error}</p>}
              {busy && (
                <div className={u.barra} role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Subiendo">
                  <span style={{ width: `${progress}%` }} />
                </div>
              )}
              <div className={f.acciones}>
                <button type="submit" className="boton boton-principal" disabled={busy || mc.length === 0}>
                  {busy ? (progress === 100 ? "Revisando…" : `Subiendo ${progress}%`) : "Subir versión"}
                </button>
              </div>
            </>
          )}
        </form>
      )}
      {error && !inspection && <p className={f.error} role="alert">{error}</p>}
    </div>
  );
}
