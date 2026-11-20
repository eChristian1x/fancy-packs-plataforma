import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { title: "Comunidad", robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={6}
      title="Comunidad"
      description="El directorio de creadores, con sus perfiles públicos y lo que han publicado."
      items={["Lista de creadores con sus publicaciones y descargas", "Seguir a un creador para ver lo nuevo que publique", "Enlaces a sus redes"]}
    />
  );
}
