import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={4}
      title="Página del pack"
      description="Cada pack va a tener su propia página con todo lo necesario para decidir y descargar."
      items={[
        "Galería de capturas, descripción completa y categorías",
        "Versiones compatibles, resolución, fecha de publicación y de actualización",
        "Botón de descarga que registra cada descarga, con tamaño y SHA-1 del archivo",
        "Packs relacionados, comentarios y valoraciones",
      ]}
    />
  );
}
