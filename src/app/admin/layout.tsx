import type { Metadata } from "next";
import { eq, isNull, sql, and } from "drizzle-orm";
import { AdminNav } from "@/components/admin/AdminNav";
import styles from "@/components/admin/Admin.module.css";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { reports, resources, resourceVersions } from "@/lib/db/schema";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Administración" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff("/admin");
  const db = await getDb();
  const [[p], [v], [r]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(resources).where(eq(resources.status, "pending")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(resourceVersions)
      .innerJoin(resources, and(eq(resources.id, resourceVersions.resourceId), eq(resources.status, "published")))
      .where(isNull(resourceVersions.publishedAt)),
    db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "open")),
  ]);
  return (
    <div className={`contenedor ${styles.marco}`}>
      <AdminNav counts={{ pending: p.n + v.n, reports: r.n }} />
      <div className={styles.contenido}>{children}</div>
    </div>
  );
}
