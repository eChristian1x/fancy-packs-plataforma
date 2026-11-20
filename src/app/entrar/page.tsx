import type { Metadata } from "next";
import { StagePlaceholder } from "@/components/ui/StagePlaceholder";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function Page() {
  return (
    <StagePlaceholder
      stage={6}
      title="Iniciar sesión"
      description="Las cuentas usan Supabase Auth. Todavía no están activas."
      items={["Registro con correo y contraseña", "Recuperación de contraseña por correo", "Favoritos, historial de descargas y creadores que sigues", "Configuración de la cuenta"]}
    />
  );
}
