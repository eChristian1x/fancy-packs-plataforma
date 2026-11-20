import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/AuthForms";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Crear cuenta", description: "Crea tu cuenta de Fancy Packs para guardar favoritos, seguir creadores y publicar." };

export default async function Page() {
  if (await getSessionUser()) redirect("/cuenta");
  return (
    <AuthLayout title="Crear cuenta" intro="Gratis. Solo necesitas un correo.">
      <SignUpForm />
    </AuthLayout>
  );
}
