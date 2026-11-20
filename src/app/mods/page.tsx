import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { title: "Mods", robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={5}
      title="Catálogo de mods"
      description="Una sección aparte para mods, con lo que hace falta para instalarlos sin errores."
      items={[
        "Filtros por loader: Fabric, Forge, NeoForge y Quilt",
        "Filtros por versión de Minecraft y categoría",
        "Historial de versiones, archivos y dependencias en cada mod",
      ]}
    />
  );
}
