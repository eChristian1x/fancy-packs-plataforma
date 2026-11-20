import { describe, expect, it } from "vitest";
import { categoryOf, legacyKey, modernKey, PVP_SLOTS } from "@/lib/pack-reader";

describe("nombres de texturas entre versiones", () => {
  it("pasa nombres de 1.12 a 1.13+", () => {
    expect(modernKey("assets/minecraft/textures/items/apple_golden.png")).toBe("item/golden_apple");
    expect(modernKey("assets/minecraft/textures/items/gold_sword.png")).toBe("item/golden_sword");
    expect(modernKey("assets/minecraft/textures/blocks/wool_colored_silver.png")).toBe("block/light_gray_wool");
    expect(modernKey("assets/minecraft/textures/blocks/fire_layer_0.png")).toBe("block/fire_0");
    expect(modernKey("assets/minecraft/textures/item/diamond_sword.png")).toBe("item/diamond_sword");
    expect(modernKey("assets/minecraft/textures/entity/end_crystal/end_crystal.png")).toBe("entity/end_crystal/end_crystal");
  });
  it("vuelve a los nombres viejos", () => {
    expect(legacyKey("item/golden_apple")).toBe("items/apple_golden");
    expect(legacyKey("items/apple_golden")).toBe("items/apple_golden");
    expect(legacyKey("block/oak_planks")).toBe("blocks/planks_oak");
  });
  it("clasifica por carpeta", () => {
    expect(categoryOf("assets/minecraft/textures/items/x.png")).toBe("Objetos");
    expect(categoryOf("assets/minecraft/textures/gui/sprites/hud/crosshair.png")).toBe("Interfaz");
    expect(categoryOf("assets/minecraft/textures/entity/equipment/humanoid/diamond.png")).toBe("Armaduras");
  });
  it("agrupa las texturas de PvP", () => {
    const slot = (k: string) => PVP_SLOTS.find((s) => s.match(k))?.key;
    expect(slot("item/netherite_sword")).toBe("espadas");
    expect(slot("item/enchanted_golden_apple")).toBe("manzanas");
    expect(slot("item/totem_of_undying")).toBe("totem");
    expect(slot("block/fire_1")).toBe("fuego");
  });
});
