import { describe, expect, it } from "vitest";
import { formatForVersion, packFields, parsePackMcmeta, versionsForFormats, versionsFromMeta } from "@/lib/pack-format";

describe("pack.mcmeta", () => {
  it("lee pack_format simple (1.8.9)", () => {
    const m = parsePackMcmeta('{"pack":{"pack_format":1,"description":"§aMi pack"}}');
    expect(m).toMatchObject({ packFormat: 1, min: 1, max: 1, description: "Mi pack" });
    expect(versionsFromMeta(m)).toContain("1.8.9");
  });
  it("lee supported_formats como arreglo y como objeto", () => {
    expect(parsePackMcmeta('{"pack":{"pack_format":22,"supported_formats":[18,34]}}')).toMatchObject({ min: 18, max: 34 });
    expect(parsePackMcmeta('{"pack":{"pack_format":22,"supported_formats":{"min_inclusive":22,"max_inclusive":32}}}')).toMatchObject({ min: 22, max: 32 });
  });
  it("lee min_format y max_format de 1.21.9+ (incluso [mayor, menor])", () => {
    const m = parsePackMcmeta('{"pack":{"min_format":84,"max_format":[97,1],"description":{"text":"Nuevo"}}}');
    expect(m.min).toBe(84);
    expect(m.max).toBeCloseTo(97.1);
    expect(m.description).toBe("Nuevo");
    expect(versionsFromMeta(m)).toEqual(expect.arrayContaining(["26.1", "26.3"]));
  });
  it("tolera comentarios y comas finales", () => {
    expect(parsePackMcmeta('{ // pack\n "pack": {"pack_format": 34, "description": "x",},\n}').packFormat).toBe(34);
  });
  it("conoce los formatos de versiones clave", () => {
    expect(formatForVersion("1.8.9")).toBe(1);
    expect(formatForVersion("1.20.1")).toBe(15);
    expect(formatForVersion("1.21.11")).toBe(75);
    expect(versionsForFormats(15, 15)).toEqual(["1.20", "1.20.1"]);
  });
  it("arma los campos de pack.mcmeta según la versión destino", () => {
    expect(packFields(1)).toEqual({ pack_format: 1 });
    expect(packFields(34)).toEqual({ pack_format: 34, supported_formats: [34, 34] });
    expect(packFields(97.1)).toEqual({ pack_format: 97, min_format: 97, max_format: [97, 1] });
  });
});
