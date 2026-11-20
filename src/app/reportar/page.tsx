import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ReportForm } from "@/components/account/ReportForm";
import { getDb } from "@/lib/db/client";
import { resources } from "@/lib/db/schema";
import { resourceHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Reportar", robots: { index: false } };

type Props = { searchParams: Promise<{ recurso?: string }> };

export default async function Page({ searchParams }: Props) {
  const id = (await searchParams).recurso ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [r] = await db.select({ name: resources.name, type: resources.type, slug: resources.slug }).from(resources).where(eq(resources.id, id)).limit(1);
  if (!r) notFound();
  return (
    <AuthLayout
      title="Reportar"
      intro={
        <>
          Sobre <Link href={resourceHref(r.type, r.slug)}>{r.name}</Link>. Los reportes los lee un administrador; no hace falta cuenta.
        </>
      }
      aside={false}
    >
      <ReportForm type="resource" id={id} />
    </AuthLayout>
  );
}
