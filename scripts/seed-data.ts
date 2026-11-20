/**
 * Datos iniciales.
 *
 * REFERENCE: datos reales que la plataforma necesita (categorías, versiones de Minecraft,
 * ajustes del sitio). Se cargan siempre.
 *
 * SAMPLE: contenido de ejemplo (creadores, packs, mods, overlays y sus cifras). Es inventado,
 * se marca con is_sample = true, la página lo señala como "ejemplo" y se borra con
 * `npm run db:clear-samples`. La API del mod nunca lo incluye.
 */
import type { ModLoader, ResourceType } from "../src/lib/db/schema";

export const SITE_SETTINGS = {
  name: "Fancy Packs",
  tagline: "La colección definitiva de texture packs para Minecraft",
  contact: "Discord: tu_usuario",
};

/** Versiones de Java Edition. Desde 26.1 Mojang numera por año (26.x). */
export const MC_VERSIONS: { id: string; releasedAt?: string; featured?: boolean }[] = [
  { id: "1.8.9", featured: true },
  { id: "1.12.2" },
  { id: "1.16.5" },
  { id: "1.20.1", featured: true },
  { id: "1.20.4" },
  { id: "1.20.6" },
  { id: "1.21" },
  { id: "1.21.1" },
  { id: "1.21.4" },
  { id: "1.21.5" },
  { id: "1.21.8" },
  { id: "1.21.10" },
  { id: "1.21.11", featured: true },
  { id: "26.1", releasedAt: "2026-03-24" },
  { id: "26.1.1", releasedAt: "2026-04-01" },
  { id: "26.1.2", featured: true },
  { id: "26.2", releasedAt: "2026-06-16", featured: true },
  { id: "26.3", featured: true },
];

export { versionSortKey } from "../src/lib/versions";

type Cat = { type: ResourceType; slug: string; name: string; description: string; icon?: string };

/**
 * Las modalidades conservan los identificadores del sitio anterior (netherite, sword, crystal…)
 * porque el mod los recibe como etiquetas en /api/v1/packs.json.
 */
export const CATEGORIES: Cat[] = [
  { type: "texture", slug: "sword", name: "Sword", icon: "sword", description: "Duelos de espada sin pociones. Espadas cortas, golpes que se leen bien y pocas partículas." },
  { type: "texture", slug: "netherite", name: "NethPot", icon: "netherite", description: "Netherite y pociones. Armadura completa, pots de curación y peleas largas." },
  { type: "texture", slug: "crystal", name: "Crystal", icon: "crystal", description: "End crystals, anclas y obsidiana. Lo importante es ver la explosión a tiempo." },
  { type: "texture", slug: "uhc", name: "UHC", icon: "uhc", description: "Sin regeneración natural: corazones claros y manzanas doradas que se distinguen." },
  { type: "texture", slug: "smp", name: "SMP", icon: "smp", description: "Para supervivencia y Lifesteal. Se ven bien peleando y también construyendo." },
  { type: "texture", slug: "boxpvp", name: "BoxPvP", icon: "boxpvp", description: "Arenas cerradas y kits rápidos. Bloques que no distraen." },
  { type: "texture", slug: "tridente", name: "Tridente", icon: "tridente", description: "Tridente con canalización y riptide. Agua y lluvia más limpias." },
  { type: "texture", slug: "mazo", name: "Mazo", icon: "mazo", description: "Combate con mazo y cargas de viento. Golpes desde arriba que se ven venir." },
  { type: "overlay", slug: "fuego", name: "Fuego bajo", description: "Llamas más pequeñas para ver mientras te quemas." },
  { type: "overlay", slug: "escudos", name: "Escudos", description: "Escudos más chicos o transparentes." },
  { type: "overlay", slug: "totems", name: "Tótems", description: "Tótems más pequeños y animación más corta." },
  { type: "overlay", slug: "cielo", name: "Cielo", description: "Cielos limpios y nubes que no estorban." },
  { type: "overlay", slug: "interfaz", name: "Interfaz", description: "Inventario, hotbar y menús." },
  { type: "overlay", slug: "particulas", name: "Partículas", description: "Menos partículas de golpe, explosión y pociones." },
  { type: "mod", slug: "hud", name: "HUD y PvP", description: "Información en pantalla: armadura, tótems, hitboxes, mira." },
  { type: "mod", slug: "optimizacion", name: "Optimización", description: "Más FPS y menos tirones." },
  { type: "mod", slug: "utilidad", name: "Utilidad", description: "Zoom, chat, atajos y ajustes de calidad de vida." },
  { type: "mod", slug: "graficos", name: "Gráficos", description: "Sombras, iluminación y efectos visuales." },
];

// ------------------------------------------------------------------ ejemplo

export const SAMPLE_CREATORS = [
  { username: "moradepixel", displayName: "Mora Pixel", bio: "Packs 16x con colores de fruta." },
  { username: "kuro16x", displayName: "Kuro", bio: "Sword y UHC desde 1.8." },
  { username: "brisapvp", displayName: "Brisa", bio: "Texturas frías y limpias." },
  { username: "tavotextures", displayName: "Tavo", bio: "Crystal PvP y SMP." },
  { username: "nyxen", displayName: "Nyxen", bio: "Mods de HUD para Fabric." },
  { username: "lunarine", displayName: "Lunarine", bio: "Overlays y partículas." },
  { username: "zafirocraft", displayName: "Zafiro", bio: "Packs para servidores mexicanos." },
  { username: "pixelchurro", displayName: "Pixel Churro", bio: "Optimización y utilidades." },
];

type SampleResource = {
  type: ResourceType;
  slug: string;
  name: string;
  owner: string;
  summary: string;
  categories: string[];
  resolution?: number;
  versions: string[];
  loaders?: ModLoader[];
  downloads: number;
  daysAgo: number;
  featured?: boolean;
  versionHistory?: { number: string; daysAgo: number; changelog: string }[];
};

export const SAMPLE_RESOURCES: SampleResource[] = [
  // ---------------- texturas
  { type: "texture", slug: "fresa-helada", name: "Fresa Helada", owner: "moradepixel", summary: "Espadas rosas cortas, cristales claros y cielo sin nubes. Pensado para Sword y Crystal.", categories: ["sword", "crystal"], resolution: 16, versions: ["1.21.11", "26.1.2", "26.2"], downloads: 48210, daysAgo: 34, featured: true },
  { type: "texture", slug: "obsidiana-rosa", name: "Obsidiana Rosa", owner: "tavotextures", summary: "Obsidiana y anclas que se distinguen de lejos. Explosiones más cortas.", categories: ["crystal"], resolution: 16, versions: ["1.21.8", "1.21.10", "1.21.11"], downloads: 31877, daysAgo: 61 },
  { type: "texture", slug: "malvavisco-32x", name: "Malvavisco 32x", owner: "moradepixel", summary: "Bloques suaves en tonos pastel para SMP, con armaduras fáciles de leer.", categories: ["smp"], resolution: 32, versions: ["26.1.2", "26.2", "26.3"], downloads: 12904, daysAgo: 12 },
  { type: "texture", slug: "nieve-limpia", name: "Nieve Limpia", owner: "brisapvp", summary: "El clásico de 1.8.9: espada corta, fuego bajo y corazones nítidos.", categories: ["sword", "uhc"], resolution: 16, versions: ["1.8.9"], downloads: 76412, daysAgo: 88, featured: true },
  { type: "texture", slug: "cobre-frio", name: "Cobre Frío", owner: "zafirocraft", summary: "Netherite con brillo de cobre y pociones de colores bien separados.", categories: ["netherite"], resolution: 16, versions: ["1.21.11", "26.2"], downloads: 22350, daysAgo: 40 },
  { type: "texture", slug: "medianoche-16x", name: "Medianoche 16x", owner: "brisapvp", summary: "Pack oscuro para jugar de noche sin cansar la vista.", categories: ["netherite", "smp"], resolution: 16, versions: ["26.2", "26.3"], downloads: 9840, daysAgo: 6 },
  { type: "texture", slug: "limonada", name: "Limonada", owner: "kuro16x", summary: "Manzanas doradas brillantes y corazones grandes para UHC.", categories: ["uhc"], resolution: 16, versions: ["1.8.9", "1.21.11"], downloads: 15102, daysAgo: 52 },
  { type: "texture", slug: "ambar-ligero", name: "Ámbar Ligero", owner: "kuro16x", summary: "8x para PCs lentas. Espada cálida y casi nada de partículas.", categories: ["sword"], resolution: 8, versions: ["1.8.9"], downloads: 40220, daysAgo: 79 },
  { type: "texture", slug: "coral-pvp", name: "Coral PvP", owner: "tavotextures", summary: "Cristales coral sobre bloques turquesa. Recién salido para 26.3.", categories: ["crystal", "smp"], resolution: 32, versions: ["26.3"], downloads: 3920, daysAgo: 3 },
  { type: "texture", slug: "jade-mini", name: "Jade Mini", owner: "zafirocraft", summary: "Kits verdes y bloques de arena que no distraen en BoxPvP.", categories: ["boxpvp"], resolution: 16, versions: ["1.21.11"], downloads: 7611, daysAgo: 22 },
  { type: "texture", slug: "tridente-azul", name: "Tridente Azul", owner: "brisapvp", summary: "Tridente brillante, lluvia fina y agua transparente.", categories: ["tridente"], resolution: 16, versions: ["1.21.11", "26.2"], downloads: 5402, daysAgo: 18 },
  { type: "texture", slug: "mazo-dorado", name: "Mazo Dorado", owner: "zafirocraft", summary: "Mazo dorado y cargas de viento visibles para pelear desde arriba.", categories: ["mazo"], resolution: 32, versions: ["1.21.11", "26.1.2"], downloads: 6630, daysAgo: 27 },
  { type: "texture", slug: "lavanda-64x", name: "Lavanda 64x", owner: "moradepixel", summary: "Más detalle para SMP tranquilo. Recomendado con una buena tarjeta de video.", categories: ["smp"], resolution: 64, versions: ["26.3"], downloads: 2210, daysAgo: 2 },
  { type: "texture", slug: "grafito", name: "Grafito", owner: "kuro16x", summary: "Gris neutro con acentos rosas. Funciona en Sword y NethPot.", categories: ["sword", "netherite"], resolution: 16, versions: ["26.1.2", "26.2", "26.3"], downloads: 18760, daysAgo: 15, featured: true },
  { type: "texture", slug: "cereza-neon", name: "Cereza Neón", owner: "tavotextures", summary: "Cristales neón con contorno, para ver cada crystal en la oscuridad.", categories: ["crystal"], resolution: 16, versions: ["26.3"], downloads: 1180, daysAgo: 1 },
  { type: "texture", slug: "arena-128x", name: "Arena 128x", owner: "zafirocraft", summary: "Pack de alta resolución para SMP con mucho detalle en bloques.", categories: ["smp"], resolution: 128, versions: ["1.21.11"], downloads: 4390, daysAgo: 70 },
  // ---------------- overlays
  { type: "overlay", slug: "fuego-bajo-plus", name: "Fuego Bajo Plus", owner: "lunarine", summary: "Baja el fuego en pantalla a un tercio. Se combina con cualquier pack.", categories: ["fuego"], resolution: 16, versions: ["1.21.11", "26.2", "26.3"], downloads: 52300, daysAgo: 44, featured: true },
  { type: "overlay", slug: "escudo-mini", name: "Escudo Mini", owner: "lunarine", summary: "Escudo más bajo para ver lo que tienes enfrente.", categories: ["escudos"], resolution: 16, versions: ["1.21.11", "26.1.2", "26.2", "26.3"], downloads: 30110, daysAgo: 30 },
  { type: "overlay", slug: "totem-chico", name: "Tótem Chico", owner: "lunarine", summary: "Tótem a la mitad de tamaño y animación más corta.", categories: ["totems"], resolution: 16, versions: ["1.21.11", "26.2"], downloads: 27880, daysAgo: 25 },
  { type: "overlay", slug: "cielo-despejado", name: "Cielo Despejado", owner: "brisapvp", summary: "Quita las nubes y aclara el cielo para ver ender pearls.", categories: ["cielo"], resolution: 32, versions: ["26.2", "26.3"], downloads: 8420, daysAgo: 9 },
  { type: "overlay", slug: "gui-oscura", name: "GUI Oscura", owner: "moradepixel", summary: "Inventario y menús en gris oscuro con detalles rosas.", categories: ["interfaz"], resolution: 16, versions: ["1.21.11", "26.3"], downloads: 19980, daysAgo: 48 },
  { type: "overlay", slug: "particulas-limpias", name: "Partículas Limpias", owner: "lunarine", summary: "Menos partículas de crítico y de poción.", categories: ["particulas"], resolution: 16, versions: ["26.1.2", "26.2", "26.3"], downloads: 14200, daysAgo: 11 },
  // ---------------- mods
  {
    type: "mod", slug: "hitbox-clara", name: "Hitbox Clara", owner: "nyxen", summary: "Muestra la hitbox de los jugadores con un color que eliges.", categories: ["hud"], versions: ["1.21.11", "26.2"], loaders: ["fabric", "quilt"], downloads: 21000, daysAgo: 8,
    versionHistory: [{ number: "2.1.0", daysAgo: 8, changelog: "Soporte para 26.2." }, { number: "2.0.0", daysAgo: 60, changelog: "Colores por equipo." }],
  },
  {
    type: "mod", slug: "zoom-suave", name: "Zoom Suave", owner: "pixelchurro", summary: "Zoom con la rueda del mouse y transición suave.", categories: ["utilidad"], versions: ["26.2", "26.3"], loaders: ["fabric", "neoforge"], downloads: 15300, daysAgo: 4,
    versionHistory: [{ number: "1.4.0", daysAgo: 4, changelog: "Soporte para 26.3." }, { number: "1.3.2", daysAgo: 41, changelog: "Arregla el zoom en pantalla completa." }],
  },
  {
    type: "mod", slug: "contador-de-totems", name: "Contador de Tótems", owner: "nyxen", summary: "Cuenta los tótems que le quedan a tu rival y los que te quedan a ti.", categories: ["hud"], versions: ["1.21.11", "26.3"], loaders: ["fabric"], downloads: 9800, daysAgo: 13,
    versionHistory: [{ number: "1.2.0", daysAgo: 13, changelog: "Contador del rival." }],
  },
  {
    type: "mod", slug: "menos-particulas", name: "Menos Partículas", owner: "pixelchurro", summary: "Elige qué partículas se ven y cuántas.", categories: ["optimizacion"], versions: ["1.20.1", "1.21.11"], loaders: ["fabric", "forge", "neoforge"], downloads: 33100, daysAgo: 37,
    versionHistory: [{ number: "3.0.1", daysAgo: 37, changelog: "Arreglo para Forge." }, { number: "3.0.0", daysAgo: 90, changelog: "Menú nuevo." }],
  },
  {
    type: "mod", slug: "mira-personalizada", name: "Mira Personalizada", owner: "nyxen", summary: "Dibuja tu propia mira y cambia su color cuando apuntas a alguien.", categories: ["hud"], versions: ["26.3"], loaders: ["fabric", "quilt"], downloads: 2400, daysAgo: 2,
    versionHistory: [{ number: "1.0.0", daysAgo: 2, changelog: "Primera versión." }],
  },
  {
    type: "mod", slug: "fps-ligero", name: "FPS Ligero", owner: "pixelchurro", summary: "Ajustes de renderizado para ganar FPS en PCs de gama baja.", categories: ["optimizacion"], versions: ["26.1.2", "26.2", "26.3"], loaders: ["fabric", "neoforge", "quilt"], downloads: 41000, daysAgo: 19, featured: true,
    versionHistory: [{ number: "5.2.0", daysAgo: 19, changelog: "Soporte para 26.3." }, { number: "5.1.0", daysAgo: 70, changelog: "Menos uso de memoria." }],
  },
  {
    type: "mod", slug: "chat-limpio", name: "Chat Limpio", owner: "pixelchurro", summary: "Agrupa mensajes repetidos y oculta los de servidores que no quieres ver.", categories: ["utilidad"], versions: ["1.20.1"], loaders: ["forge", "neoforge"], downloads: 6100, daysAgo: 66,
    versionHistory: [{ number: "1.1.0", daysAgo: 66, changelog: "Filtros por palabra." }],
  },
  {
    type: "mod", slug: "armadura-hud", name: "Armadura HUD", owner: "nyxen", summary: "Durabilidad de tu armadura en una esquina de la pantalla.", categories: ["hud"], versions: ["1.21.11", "26.2"], loaders: ["fabric"], downloads: 11700, daysAgo: 29,
    versionHistory: [{ number: "1.5.0", daysAgo: 29, changelog: "Posición configurable." }],
  },
];

export const SAMPLE_IMAGE: Record<ResourceType, string> = {
  texture: "/samples/textures",
  overlay: "/samples/overlays",
  mod: "/samples/mods",
  skin: "/samples/skins",
  other: "/samples/other",
};
