import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { NewPasswordForm } from "@/components/auth/AuthForms";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Contraseña nueva", robots: { index: false } };

export default async function Page() {
  await requireUser("/cuenta/clave");
  return (
    <AuthLayout title="Contraseña nueva" aside={false}>
      <NewPasswordForm />
    </AuthLayout>
  );
}
