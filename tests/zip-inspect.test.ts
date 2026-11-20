import fs from "node:fs";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { inspectMod, inspectResourcePack, nearestResolution } from "@/lib/zip-inspect";

const sample = (f: string) => new Uint8Array(fs.readFileSync(`public/samples/files/${f}`));

describe("revisión de resource packs", () => {
  it("acepta un pack válido y detecta versiones y resolución", () => {
    const r = inspectResourcePack(sample("grafito.zip"));
    expect(r.ok).toBe(true);
    expect(r.meta?.max).toBe(97);
    expect(r.versions).toContain("26.3");
    expect(r.resolution).toBe(16);
    expect(r.hasIcon).toBe(true);
  });
  it("rechaza un .zip sin pack.mcmeta", () => {
    const r = inspectResourcePack(zipSync({ "assets/minecraft/textures/item/a.png": new Uint8Array(4) }));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/pack\.mcmeta/);
  });
  it("explica cuando el pack está comprimido con su carpeta", () => {
    const r = inspectResourcePack(zipSync({ "MiPack/pack.mcmeta": strToU8('{"pack":{"pack_format":1}}') }));
    expect(r.errors[0]).toMatch(/dentro de la carpeta "MiPack"/);
  });
  it("detecta packs de Bedrock", () => {
    expect(inspectResourcePack(zipSync({ "manifest.json": strToU8("{}") })).errors[0]).toMatch(/Bedrock/);
  });
  it("rechaza archivos que no son .zip", () => {
    expect(inspectResourcePack(strToU8("hola")).ok).toBe(false);
  });
  it("avisa de archivos basura", () => {
    const r = inspectResourcePack(zipSync({ "pack.mcmeta": strToU8('{"pack":{"pack_format":34}}'), "__MACOSX/._x": new Uint8Array(1) }));
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/basura/);
  });
  it("redondea resoluciones", () => {
    expect(nearestResolution(17)).toBe(16);
    expect(nearestResolution(100)).toBe(128);
  });
});

describe("revisión de mods", () => {
  it("lee un mod de Fabric con NeoForge y sus dependencias", () => {
    const r = inspectMod(sample("fps-ligero-5.2.0.jar"));
    expect(r.ok).toBe(true);
    expect(r.loaders).toEqual(expect.arrayContaining(["fabric", "neoforge"]));
    expect(r.version).toBe("5.2.0");
    expect(r.dependencies.map((d) => d.id)).toContain("fabric-api");
  });
  it("lee el rango de Minecraft de mods.toml", () => {
    expect(inspectMod(sample("chat-limpio-1.1.0.jar")).mcRange).toBe("[1.20.1,1.20.1]");
  });
  it("rechaza un .jar que no es mod", () => {
    expect(inspectMod(zipSync({ "a.class": new Uint8Array(2) })).errors[0]).toMatch(/No es un mod/);
  });
});
