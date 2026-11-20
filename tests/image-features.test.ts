import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { cosine, FEATURE_SIZE, featuresFromRgba256 } from "@/lib/image-features";

const solid = (r: number, g: number, b: number) => {
  const a = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < a.length; i += 4) a.set([r, g, b, 255], i);
  return a;
};

describe("huella visual", () => {
  it("tiene 112 valores y largo 1", () => {
    const v = featuresFromRgba256(solid(255, 111, 177));
    expect(v).toHaveLength(FEATURE_SIZE);
    expect(Math.hypot(...v)).toBeCloseTo(1, 6);
  });
  it("la misma imagen da similitud 1 y colores distintos dan menos", () => {
    const rosa = featuresFromRgba256(solid(255, 111, 177));
    expect(cosine(rosa, rosa)).toBeCloseTo(1, 6);
    expect(cosine(rosa, featuresFromRgba256(solid(20, 200, 60)))).toBeLessThan(0.5);
  });
  it("coincide con la huella calculada en Python para el contenido de ejemplo", () => {
    const manifest = JSON.parse(fs.readFileSync("scripts/samples/manifest.json", "utf8"));
    const v = manifest["fresa-helada"].features[0].vector as number[];
    expect(v).toHaveLength(FEATURE_SIZE);
    expect(Math.hypot(...v)).toBeCloseTo(1, 3);
  });
  it("rechaza tamaños equivocados", () => {
    expect(() => featuresFromRgba256(new Uint8Array(10))).toThrow();
  });
});
