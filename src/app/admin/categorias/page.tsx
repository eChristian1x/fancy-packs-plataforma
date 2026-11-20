import { ActionButton } from "@/components/admin/ActionButton";
import styles from "@/components/admin/Admin.module.css";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { deleteCategory } from "@/lib/actions/admin";
import { listCategories } from "@/lib/queries/admin";
import { categoryHref, TYPE_LABEL } from "@/lib/routes";
import type { ResourceType } from "@/lib/db/schema";
import Link from "next/link";

export const metadata = { title: "Categorías" };

export default async function Page() {
  const cats = await listCategories();
  const types = ["texture", "overlay", "mod"] as ResourceType[];
  return (
    <>
      <header className={styles.titulo}>
        <h1>Categorías</h1>
        <p>Las modalidades y temas que se usan para filtrar. El identificador se usa en la URL y en la API del mod.</p>
      </header>
      {types.map((t) => (
        <section key={t} aria-labelledby={`c-${t}`}>
          <h2 id={`c-${t}`} className={styles.h2}>{TYPE_LABEL[t].many}</h2>
          <ul style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {cats
              .filter((c) => c.type === t)
              .map((c) => (
                <li key={c.id}>
                  <details className={styles.grafica}>
                    <summary style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
                      <b>{c.name}</b>
                      <span className={styles.sub}>
                        /{c.slug} · {c.n} publicaciones · orden {c.sortOrder}
                      </span>
                      <Link href={categoryHref(t, c.slug)} className={styles.sub} style={{ marginLeft: "auto" }}>
                        Ver en el catálogo
                      </Link>
                    </summary>
                    <CategoryForm c={c} />
                    {c.n === 0 && <ActionButton action={deleteCategory.bind(null, c.id)} label="Borrar categoría" tone="peligro" confirm="¿Borrarla?" />}
                  </details>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <section className={styles.grafica} aria-labelledby="nueva">
        <h2 id="nueva" className={styles.h2}>Nueva categoría</h2>
        <CategoryForm />
      </section>
    </>
  );
}
