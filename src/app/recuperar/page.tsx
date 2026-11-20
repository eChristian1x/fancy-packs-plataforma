import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function Page() {
  return (
    <AuthLayout title="Recuperar contraseña" intro="Te mandamos un enlace para elegir una contraseña nueva." aside={false}>
      <ResetForm />
    </AuthLayout>
  );
}
