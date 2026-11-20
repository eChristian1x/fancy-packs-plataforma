import type { ResourceType } from "@/lib/db/schema";

/** Ruta base de cada tipo de recurso. */
export const TYPE_PATH: Record<ResourceType, string> = {
  texture: "/texturas",
  overlay: "/overlays",
  mod: "/mods",
  skin: "/skins",
  other: "/recursos",
};

export const TYPE_LABEL: Record<ResourceType, { one: string; many: string }> = {
  texture: { one: "Textura", many: "Texturas" },
  overlay: { one: "Overlay", many: "Overlays" },
  mod: { one: "Mod", many: "Mods" },
  skin: { one: "Skin", many: "Skins" },
  other: { one: "Recurso", many: "Recursos" },
};

export const resourceHref = (type: ResourceType, slug: string) => `${TYPE_PATH[type]}/${encodeURIComponent(slug)}`;
export const creatorHref = (username: string) => `/creadores/${encodeURIComponent(username)}`;
export const categoryHref = (type: ResourceType, slug: string) => `${TYPE_PATH[type]}?categoria=${encodeURIComponent(slug)}`;
export const searchHref = (q: string) => `/buscar?q=${encodeURIComponent(q)}`;

export const LOADER_LABEL: Record<string, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
};
