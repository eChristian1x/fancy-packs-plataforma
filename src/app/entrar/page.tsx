import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { getSessionUser, safeNext } from "@/lib/auth/session";
import { DEV_MODE } from "@/lib/dev";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

type Props = { searchParams: Promise<{ siguiente?: string; error?: string }> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.siguiente, "/cuenta");
  if (await getSessionUser()) redirect(next);
  const notice = sp.error === "enlace" ? "El enlace del correo ya no sirve (venció o ya se usó). Inicia sesión o pide uno nuevo." : undefined;
  return (
    <AuthLayout title="Iniciar sesión">
      <LoginForm next={next} notice={notice} devMode={DEV_MODE} />
    </AuthLayout>
  );
}
