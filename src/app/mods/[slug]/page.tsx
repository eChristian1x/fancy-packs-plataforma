import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={5}
      title="Página del mod"
      description="Cada mod va a tener su página con archivos por versión y dependencias."
      items={["Archivos descargables por versión y loader", "Historial de versiones con cambios", "Dependencias obligatorias y opcionales", "Galería y descripción"]}
    />
  );
}
