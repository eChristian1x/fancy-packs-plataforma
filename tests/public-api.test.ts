import { describe, expect, it } from "vitest";
import { parseListParams } from "@/lib/queries/public-api";

const p = (qs: string) => parseListParams(new URLSearchParams(qs));

describe("parámetros de GET /api/v1/packs", () => {
  it("valores por omisión", () => {
    expect(p("")).toMatchObject({ q: "", sort: "popular", version: null, type: null, page: 1, limit: 24, samples: false });
  });
  it("con búsqueda ordena por relevancia salvo que pidan otro orden", () => {
    expect(p("q=fresa").sort).toBe("relevance");
    expect(p("q=fresa&sort=downloads").sort).toBe("downloads");
  });
  it("acepta órdenes en inglés y en español", () => {
    expect(p("sort=recientes").sort).toBe("recent");
    expect(p("sort=new").sort).toBe("recent");
    expect(p("sort=raro").sort).toBe("popular");
  });
  it("limpia valores inválidos", () => {
    const r = p("version=<script>&type=mod&resolution=17&page=-4&limit=500&category=Sword!");
    expect(r).toMatchObject({ version: null, type: null, resolution: null, page: 1, limit: 50, category: null });
  });
  it("lee versión, tipo, categoría, resolución y ejemplos", () => {
    expect(p("version=1.21.11&type=overlay&category=sword&resolution=16&samples=1&page=3&limit=10")).toMatchObject({
      version: "1.21.11", type: "overlay", category: "sword", resolution: 16, samples: true, page: 3, limit: 10,
    });
  });
});
