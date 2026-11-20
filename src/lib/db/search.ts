import { inArray, sql } from "drizzle-orm";
import type { Db } from "./client";
import { resources } from "./schema";

/**
 * Recalcula resources.search_text: nombre, resumen, autor, usuario y categorías,
 * en minúsculas y sin acentos (función fp_normalize de la migración 0001).
 * Hay que llamarla después de crear o editar un recurso o sus categorías.
 */
export async function refreshSearchText(db: Db, ids?: string[]) {
  if (ids && !ids.length) return;
  await db
    .update(resources)
    .set({
      searchText: sql`fp_normalize(concat_ws(' ',
        ${resources.name}, ${resources.summary}, ${resources.authorName},
        (select p.username || ' ' || p.display_name from profiles p where p.id = ${resources.ownerId}),
        (select string_agg(c.name || ' ' || c.slug, ' ') from resource_categories rc
           join categories c on c.id = rc.category_id where rc.resource_id = ${resources.id})
      ))`,
    })
    .where(ids ? inArray(resources.id, ids) : undefined);
}
