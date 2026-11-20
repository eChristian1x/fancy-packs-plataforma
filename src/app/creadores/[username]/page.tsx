import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={6}
      title="Perfil del creador"
      description="Cada creador va a tener un perfil público."
      items={["Sus packs, mods y overlays", "Descargas totales y seguidores", "Biografía y redes sociales"]}
    />
  );
}
