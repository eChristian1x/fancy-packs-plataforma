import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { title: "Publicar", robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={6}
      title="Publicar un pack o un mod"
      description="Los creadores con cuenta van a poder subir y administrar lo que publican."
      items={[
        "Subir texturas, overlays y mods con revisión automática del archivo",
        "Agregar capturas y editar la publicación",
        "Administrar versiones y ver estadísticas de descargas",
      ]}
    />
  );
}
