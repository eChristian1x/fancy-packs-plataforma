/** Herramientas: un solo lugar para nombres, rutas y descripciones (índice, páginas y sitemap). */
export const TOOLS = [
  {
    slug: "buscar-por-captura",
    name: "Buscar por captura",
    short: "Sube una captura de Minecraft y encuentra los packs que más se parecen.",
    intro: "Sube o pega una captura del juego. Te mostramos los packs de Fancy Packs con colores y composición más parecidos. La imagen no sale de tu navegador.",
  },
  {
    slug: "visor",
    name: "Visor de texturas",
    short: "Abre un .zip y recorre sus texturas sin instalarlo.",
    intro: "Abre cualquier pack y mira todas sus texturas por categoría: objetos, bloques, armaduras, interfaz, partículas. Descarga la que quieras como PNG.",
  },
  {
    slug: "comparador",
    name: "Comparador de packs",
    short: "Dos packs lado a lado: espadas, manzanas, perlas, pociones y más.",
    intro: "Pon dos packs lado a lado. Las texturas se emparejan aunque un pack sea de 1.8 y el otro de 1.21.",
  },
  {
    slug: "analizador",
    name: "Analizador de .zip",
    short: "Revisa versión, archivos que sobran y errores comunes de un pack o mod.",
    intro: "Revisa un resource pack (.zip) o un mod (.jar): para qué versión es, qué cambia, y los errores comunes que hacen que no cargue.",
  },
  {
    slug: "convertidor",
    name: "Conversor de versiones",
    short: "Pasa un pack de 1.8 a 1.21 (o al revés): pack.mcmeta, carpetas y nombres.",
    intro: "Actualiza el pack.mcmeta y renombra carpetas y texturas que cambiaron entre versiones (items → item, apple_golden → golden_apple, armaduras de 1.21.2).",
  },
  {
    slug: "personalizador",
    name: "Personalización PvP",
    short: "Arma tu pack con la espada de uno, las manzanas de otro y el tótem de otro.",
    intro: "Elige de qué pack sale cada cosa: espadas, manzanas, perlas, pociones, tótem, armaduras, fuego, cielo. Te armamos un .zip listo para el juego, con el crédito de cada parte.",
  },
] as const;

export type ToolSlug = (typeof TOOLS)[number]["slug"];
