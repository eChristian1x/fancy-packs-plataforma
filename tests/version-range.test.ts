import { describe, expect, it } from "vitest";
import { inRange } from "@/lib/version-range";
import { sortVersions, versionRange } from "@/lib/versions";

describe("rangos de versiones de mods", () => {
  it.each([
    ["1.21.11", ">=1.21 <=26.2", true],
    ["26.3", ">=1.21 <=26.2", false],
    ["1.20.1", "[1.20.1,1.21)", true],
    ["1.21", "[1.20.1,1.21)", false],
    ["1.21.4", "[1.21,)", true],
    ["1.21.4", "~1.21", true],
    ["1.20.6", "~1.21", false],
    ["1.21.4", "1.21.x", true],
    ["26.1", "*", true],
    ["1.20.1", "1.20.1 || 1.19.2", true],
  ])("%s en %s → %s", (v, r, ok) => expect(inRange(v, r)).toBe(ok));
});

describe("orden de versiones", () => {
  it("ordena como números, no como texto", () => {
    expect(sortVersions(["1.21.11", "1.8.9", "26.1", "1.21.2"])).toEqual(["1.8.9", "1.21.2", "1.21.11", "26.1"]);
    expect(versionRange(["26.2", "1.21.11"])).toBe("1.21.11 – 26.2");
  });
});
