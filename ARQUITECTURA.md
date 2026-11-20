# Arquitectura de Fancy Packs

## 1. Qué había (etapa 1: análisis)

El sitio anterior (`fancy-pagina/fancy-packs`) era estático, en GitHub Pages:

- `index.html`, `assets/app.js`, `assets/common.js` y `assets/style.css`, en HTML, CSS y JS sin framework.
- Cada pack era una carpeta `packs/<slug>/` con `info.json`, un `.zip` y fotos.
- `scripts/build.py` validaba el zip (que tenga `pack.mcmeta` y no sea de Bedrock), calculaba SHA-1 y SHA-512 y generaba `api/v1/packs.json`. Esa API la leían **la página y el mod**.
- `admin.html` subía packs haciendo commits a GitHub con un token personal.
- Tenía 0 packs publicados.

**Límite principal:** sin servidor ni base de datos no se pueden tener cuentas, contar descargas reales, comentarios, favoritos, subidas de creadores ni reportes. Además, GitHub limita cada archivo a 100 MB y recomienda que el repositorio no pase de 1 GB.

**Lo que se conserva:**

| Del sitio anterior | En la plataforma |
| --- | --- |
| Formato de `api/v1/packs.json` | Idéntico (`src/lib/queries/mod-api.ts`) |
| Identificadores de modalidad (`netherite`, `sword`…) | Mismos `slug` en la tabla `categories` |
| Validación del .zip y hashes SHA | Columnas `sha1`/`sha512` y `scan_status` en `resource_files` (la revisión se programa en la etapa 6) |
| Registro del permiso del creador | `resources.permission_note` (obligatorio si quien sube no es el autor) |
| Logo e iconos pixel de modalidades | `public/brand/`, `src/components/ui/PixelIcon.tsx` |
| Tutoriales | `/ayuda/instalar` |
| Reglas del README | `/reglas` |
| Datos de `site.json` | Tabla `site_settings` |

**Lo que cambia:** se quita el degradado rosa→cian y el modo claro, porque el brief pide rosa, blanco y amarillo sobre fondos oscuros, sin degradados excesivos. La fuente pasa de Outfit a Archivo.

## 2. Stack

- **Next.js 16** (App Router, React 19, TypeScript). Las páginas se renderizan en el servidor, lo que ayuda al SEO de cada pack.
- **Postgres** con **Drizzle ORM**. En producción, Supabase; en local, **PGlite** (Postgres embebido en `.data/`) para trabajar sin cuentas.
- **Supabase Auth** (etapa 6): registro, inicio de sesión y recuperación de contraseña.
- **Supabase Storage** (etapa 4/6): archivos `.zip`/`.jar` e imágenes.
- **CSS Modules** con tokens en `src/app/globals.css`. Sin librería de componentes.

Todo el acceso a datos ocurre en el servidor (`src/lib/queries/*`, marcado con `server-only`). Las consultas usan caché de 60 s con la etiqueta `resources`; al publicar o editar algo hay que llamar `revalidateTag("resources")`.

## 3. Estructura

```
src/
  app/                    rutas (una carpeta por URL)
    page.tsx              inicio
    api/v1/packs.json     API del mod (mismo formato que antes)
    api/v1/packs/[file]   un pack: /api/v1/packs/<slug>.json
    texturas/ mods/ …     secciones (las de etapas futuras muestran qué viene)
  components/
    layout/               barra, pie, aviso de ejemplo
    home/                 secciones del inicio (hero, hotbar, cifras…)
    cards/                tarjetas reutilizables (textura, mod, overlay, fila)
    ui/                   iconos, avatar pixel, estados vacíos
  lib/
    db/schema.ts          esquema completo (todas las etapas)
    db/client.ts          conexión (Postgres o PGlite)
    queries/              consultas del servidor
    format.ts versions.ts routes.ts
scripts/
  db-setup.ts             migraciones + datos de referencia + ejemplo
  seed-data.ts            categorías, versiones de Minecraft, contenido de ejemplo
  clear-samples.ts        borra el contenido de ejemplo
drizzle/                  migraciones SQL generadas
```

## 4. Modelo de datos

Las tablas cubren todas las etapas desde ahora, para no rehacerlas después:

- `profiles`: perfiles públicos, con su rol (`user`, `creator`, `moderator`, `admin`) y redes sociales.
- `resources`: texturas, overlays, mods y skins, en una sola tabla con `type`. Contadores desnormalizados (`download_count`, `favorite_count`, `rating_sum`/`rating_count`) para que los listados sean rápidos.
- `categories` + `resource_categories`: categorías por tipo.
- `mc_versions`: versiones de Minecraft con `sort_key` numérico, para que 1.21.11 quede antes que 26.1.
- `resource_versions` + `resource_files` + `dependencies`: historial de versiones, archivos con hashes y dependencias de mods.
- `gallery_images`, `downloads` (registro con IP hasheada), `favorites`, `follows`, `comments`, `ratings`, `reports` y `site_settings`.

**Contenido de ejemplo:** `is_sample = true` en `profiles` y `resources`. La interfaz lo marca, las cifras dicen "Cifras de ejemplo", la API del mod nunca lo incluye y `npm run db:clear-samples` lo borra.

## 5. Catálogo y búsqueda (etapa 3)

- **Rutas:** `/texturas` y `/overlays` (misma vista, `src/components/catalog/`) y `/buscar` (búsqueda global).
- **Estado en la URL**, para que cualquier vista se pueda compartir: `?q=fresa&categoria=sword,crystal&version=1.21.11&res=16,32&creador=kuro&orden=descargas&pagina=2`. Los valores que no se reconocen se ignoran (`src/lib/catalog-params.ts`).
- **Filtros:** dentro de un mismo grupo se combinan con "o" (Sword o Crystal) y entre grupos con "y". Cada opción muestra cuántos resultados daría con los demás filtros aplicados; las que darían 0 aparecen apagadas.
- **Búsqueda:** columna `resources.search_text` con nombre, resumen, autor, usuario y categorías, en minúsculas y sin acentos (función SQL `fp_normalize`). Cada palabra tiene que aparecer o parecerse, usando trigramas con `pg_trgm`, `word_similarity ≥ 0.5` y palabras de 4 letras o más. Así "ambar" encuentra "Ámbar" y "sord" encuentra "sword". Después de crear o editar un recurso hay que llamar `refreshSearchText()` (`src/lib/db/search.ts`).
- **Orden "Populares":** `(descargas + 5 × favoritos) / (días desde publicación + 2)^0.7`. Un pack nuevo que ya se descarga mucho sube por encima de uno viejo. Cuando exista el registro de descargas (etapa 4) conviene cambiarlo a "descargas de los últimos 30 días". "Más descargados" es el total; "Más recientes", la fecha; "Más relevantes" aparece solo al buscar.
- **Paginación** numerada, de 24 por página. Cada página tiene su URL (`rel=prev/next`), y una página fuera de rango muestra la última.
- **SEO:** se indexan las vistas sin filtros y las de una sola categoría (título propio, como "Texturas Sword para Minecraft PvP"); el resto lleva `noindex, follow`. La ruta de navegación incluye `BreadcrumbList` y el sitemap incluye las categorías con contenido.
- **Sin streaming:** no hay `loading.tsx`. Las páginas llegan completas en el HTML, tanto a buscadores como a navegadores sin JavaScript (los filtros funcionan con formularios normales). Al cambiar de página se ve una barra de progreso (`NavProgress`), y al filtrar los resultados se atenúan mientras llegan los nuevos.

## 6. Diseño

- **Color:** Obsidiana `#15101A` (fondo), Amatista `#201726` (superficies), Fresa `#FF6FB1` (acción y marca), Nata `#FFF6FA` (texto) y Miel `#FFD447` (cifras y destacados).
- **Tipografía:** Archivo, en ancho expandido para títulos (eco de las letras del logo) y normal para el texto.
- **Elemento distintivo:** la hotbar del inicio. Son 9 casillas, el nombre del objeto "en la mano" arriba, el número de packs como pila de ítems y las teclas 1–9 como en el juego. Se usa solo ahí.
- **Detalles pixel en dosis pequeñas:** esquinas escalonadas en botones, iconos pixel de modalidades y avatares pixel generados a partir del nombre.
- **Composición distinta por sección:** tarjetas grandes (populares), lista densa (últimas), tarjetas horizontales (mods), carrusel (overlays) y selección editorial (recomendados).

## 7. Etapas

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | Análisis del proyecto actual | Hecha |
| 2 | Página principal | Hecha |
| 3 | Catálogo de texturas y overlays + búsqueda | Hecha |
| 4 | Página de cada recurso + descargas reales | Pendiente |
| 5 | Catálogo y páginas de mods | Pendiente |
| 6 | Usuarios y creadores (Supabase Auth, subidas) | Pendiente |
| 7 | Herramientas (primero: búsqueda por captura) | Pendiente |
| 8 | Panel de administración | Pendiente |
| 9 | Optimización y pruebas | Pendiente |

## 8. Pendientes que hay que decidir antes de la etapa 4

- **Redirecciones en el mod.** Las descargas van a pasar por una ruta de la app (`packs/<slug>/<archivo>.zip`) que registra la descarga y redirige al archivo en Supabase Storage. Hay que confirmar en el código del mod que su cliente HTTP sigue redirecciones (`HttpClient.Redirect.NORMAL`). Si no las sigue, la app tiene que servir el archivo directamente.
- **Búsqueda por captura (etapa 7).** Plan: calcular un embedding de imagen por cada captura de la galería (modelo CLIP), guardarlo con `pgvector` en Supabase y buscar por similitud. Antes de construirlo hay que elegir dónde corre el modelo.
