import { describe, expect, it } from "vitest";
import { catalogHref, parseCatalogQuery } from "@/lib/catalog-params";
import { safeNext } from "@/lib/safe-next";

describe("parámetros del catálogo", () => {
  it("limpia valores desconocidos", () => {
    const q = parseCatalogQuery({ res: "16,999", categoria: "sword,<script>", loader: "fabric,bukkit", orden: "raro", pagina: "-3" });
    expect(q.res).toEqual(["16"]);
    expect(q.categorias).toEqual(["sword"]);
    expect(q.loaders).toEqual(["fabric"]);
    expect(q.orden).toBe("populares");
    expect(q.pagina).toBe(1);
  });
  it("con búsqueda ordena por relevancia", () => {
    expect(parseCatalogQuery({ q: "fresa" }).orden).toBe("relevancia");
  });
  it("arma URLs y vuelve a la página 1 al cambiar filtros", () => {
    const q = parseCatalogQuery({ categoria: "sword", pagina: "3" });
    expect(catalogHref("/texturas", q, { res: ["16", "32"] })).toBe("/texturas?categoria=sword&res=16,32");
    expect(catalogHref("/texturas", q, { pagina: 2 })).toBe("/texturas?categoria=sword&pagina=2");
    expect(catalogHref("/mods", parseCatalogQuery({}), { loaders: ["quilt"] })).toBe("/mods?loader=quilt");
  });
});

describe("redirecciones seguras", () => {
  it.each([
    ["/cuenta", "/cuenta"],
    ["//evil.com", "/"],
    ["https://evil.com", "/"],
    ["/\\evil.com", "/"],
    [undefined, "/"],
  ])("%s → %s", (v, out) => expect(safeNext(v)).toBe(out));
});
