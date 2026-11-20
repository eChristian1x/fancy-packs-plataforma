import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { DangerZone, ImagesSection, InfoSection, ReviewBox, VersionList, type EditorData } from "@/components/panel/EditorSections";
import styles from "@/components/panel/Panel.module.css";
import f from "@/components/forms/Form.module.css";
import { VersionUploader } from "@/components/panel/VersionUploader";
import { isStaff, requireUser } from "@/lib/auth/session";
import { checklistFor, suggestNextVersion } from "@/lib/publishing";
import { getEditableResource } from "@/lib/queries/panel";
import { STATUS_LABEL } from "@/lib/status";
import { DEV_MODE } from "@/lib/dev";
import { AUTH_ENABLED } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Editar publicación", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/panel/recursos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getEditableResource(id);
  if (!data) notFound();
  const r = data.resource;
  if (r.ownerId !== user.id && !isStaff(user)) redirect("/panel");
  const [checklist, suggested] = await Promise.all([checklistFor(id), suggestNextVersion(id)]);

  const d: EditorData = {
    id: r.id,
    type: r.type,
    slug: r.slug,
    status: r.status,
    name: r.name,
    summary: r.summary,
    description: r.description ?? "",
    authorName: r.authorName,
    authorUrl: r.authorUrl ?? "",
    permissionNote: r.permissionNote ?? "",
    resolution: r.resolution,
    coverUrl: r.coverUrl,
    iconUrl: r.iconUrl,
    categoryIds: data.categoryIds,
    categories: data.allCategories.map((c) => ({ id: c.id, name: c.name })),
    gallery: data.gallery.map((g) => ({ id: g.id, url: g.url })),
    ownerDisplayName: user.id === r.ownerId ? user.displayName : r.authorName,
  };
  const versions = data.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    channel: v.channel,
    mcVersions: v.mcVersions,
    loaders: v.loaders as string[],
    publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString() : null,
    files: v.files.map((x) => ({ fileName: x.fileName, sizeBytes: x.sizeBytes, sha1: x.sha1 })),
    dependencies: v.dependencies.map((x) => x.externalName ?? "?"),
  }));
  const isMod = r.type === "mod";

  return (
    <div className={`contenedor ${styles.pagina}`}>
      <div>
        <Breadcrumbs items={[{ href: "/panel", label: "Mis publicaciones" }, { href: `/panel/recursos/${r.id}`, label: r.name }]} />
        <header className={styles.cabeza} style={{ marginTop: 12 }}>
          <div>
            <h1>{r.name}</h1>
            <p>
              <span className={styles.estado} data-s={r.status}>{STATUS_LABEL[r.status]}</span>
            </p>
          </div>
        </header>
      </div>

      {sp.nuevo && (
        <div className={styles.aviso} data-tono="ok" role="status">
          <b>Borrador creado.</b>
          <p>Completa lo que falta en la lista de la derecha y envíalo a revisión. Puedes salir y volver cuando quieras.</p>
        </div>
      )}
      {r.status === "pending" && (
        <div className={styles.aviso} role="status">
          <b>En revisión.</b>
          <p>Un administrador lo va a revisar. Puedes seguir editando mientras tanto.</p>
        </div>
      )}
      {r.status === "rejected" && (
        <div className={styles.aviso} data-tono="error" role="status">
          <b>Rechazado.</b>
          <p>{r.rejectionReason || "Sin motivo escrito."} Corrige lo necesario y vuelve a enviarlo.</p>
        </div>
      )}
      {r.status === "removed" && (
        <div className={styles.aviso} data-tono="error" role="status">
          <b>Retirado.</b>
          <p>{r.rejectionReason || "Ya no se ve en el catálogo."}</p>
        </div>
      )}
      {!AUTH_ENABLED && !DEV_MODE && <div className={styles.aviso}>Las subidas no están activadas en este servidor (faltan las variables de Supabase).</div>}

      <div className={styles.editor}>
        <div className={styles.secciones}>
          <InfoSection d={d} />
          <ImagesSection d={d} userId={user.id} />
          <section className={f.seccion} aria-labelledby="s-ver" id="versiones">
            <h2 id="s-ver">{isMod ? "Versiones y archivos" : "Archivo del pack"}</h2>
            <p>
              {isMod
                ? "Cada versión lleva su .jar, sus versiones de Minecraft y sus dependencias."
                : "Sube el .zip tal como se pone en la carpeta resourcepacks. Para actualizarlo, sube una versión nueva."}
            </p>
            <VersionList d={d} versions={versions} />
            <VersionUploader resourceId={r.id} userId={user.id} isMod={isMod} suggestedVersion={suggested} mcList={data.mcVersionList} />
          </section>
        </div>
        <aside className={styles.lateral}>
          <ReviewBox d={d} checklist={checklist} />
          {r.status !== "removed" && <DangerZone d={d} />}
          <p className={f.ayuda}>
            ¿Dudas? Lee las <Link href="/reglas" className={f.enlace}>reglas de publicación</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
}
