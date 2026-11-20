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

Todo el acceso a datos ocurre en el servidor (`src/lib/queries/*`, marcado con `server-only`). Las consultas usan caché de 60 s con la etiqueta `resources`; cada recurso tiene además la suya (`recurso:<slug>`) para que comentar o valorar solo invalide esa página. Las acciones del servidor llaman `updateTag`.

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

## 7. Páginas de recursos y descargas (etapa 4)

- **Una sola vista** para texturas, overlays y mods (`src/components/resource/ResourcePage.tsx`): galería con visor, descripción con formato mínimo y seguro (sin HTML), tarjeta de descarga (archivo, tamaño, SHA-1), datos, creador, relacionados y JSON-LD (`CreativeWork` o `SoftwareApplication`). En mods, historial de versiones con archivos y dependencias.
- **Descargas** (`/descargar/<slug>`): busca el archivo principal de la última versión publicada, lo registra y redirige a Storage. La misma IP cuenta una vez por recurso cada 24 horas; los bots no cuentan. La IP se guarda como `sha256(ip + DOWNLOAD_SALT)`. Con sesión iniciada, la descarga queda en el historial aunque no sume al contador.
- **Ruta del mod** (`/packs/<slug>/<archivo>`): sirve los bytes sin redirigir (no sabemos si el cliente HTTP del mod sigue redirecciones). También `packs/<slug>/icon` y `packs/<slug>/gallery/<n>`.
- **Revisión de archivos** (`src/lib/zip-inspect.ts`, sirve en navegador y servidor): `pack.mcmeta` en todos sus formatos (`pack_format`, `supported_formats`, `min_format`/`max_format` de 1.21.9+), versiones compatibles a partir de la tabla de `pack_format` (`src/lib/pack-format-table.ts`, del paquete `pack-format`), resolución, Bedrock, carpeta extra al comprimir y archivos basura. Para `.jar`: `fabric.mod.json`, `quilt.mod.json`, `mods.toml` y `neoforge.mods.toml`, con dependencias y rango de Minecraft.

## 8. Mods (etapa 5)

`/mods` usa el mismo catálogo con un filtro más: **loader** (`?loader=fabric,quilt`). La resolución no aplica.

## 9. Cuentas y creadores (etapa 6)

- **Supabase Auth** con `@supabase/ssr`. `src/proxy.ts` renueva la sesión solo si el visitante tiene cookies `sb-…`, así las visitas anónimas no esperan nada extra. `getSessionUser()` (una vez por petición) valida la sesión con Supabase y crea el perfil la primera vez (el `id` del perfil es el de `auth.users`). Los correos de `ADMIN_EMAILS` entran como administradores.
- **Páginas:** `/entrar`, `/registro`, `/recuperar`, `/cuenta` (favoritos, historial de descargas, siguiendo), `/cuenta/ajustes` (perfil, foto, redes, correo, contraseña), `/creadores/<usuario>` y `/comunidad` (directorio).
- **Publicar:** `/publicar` crea un borrador; `/panel/recursos/<id>` lo edita (información, categorías, crédito y permiso del autor, portada, ícono, galería, versiones). El archivo se revisa en el navegador antes de subirlo (respuesta inmediata) y otra vez en el servidor, que no confía en lo que dijo el navegador. Una lista muestra lo que falta y el botón *Enviar a revisión* se activa cuando está completo.
- **Subidas directas a Storage:** el navegador sube a `archivos/<id del usuario>/<uuid>/<nombre>` o `imagenes/<id>/<uuid>.webp` con la sesión del usuario (las imágenes se reducen y pasan a WebP antes). Las políticas del bucket (`supabase/storage.sql`) solo dejan escribir en la carpeta propia. Después, una acción del servidor comprueba la ruta, descarga el archivo, lo revisa, calcula SHA-1/SHA-512 (y la huella visual de las imágenes con `sharp`) y crea los registros. Si algo falla, borra el archivo.
- **Moderación:** una publicación nueva queda *en revisión*. Las versiones nuevas de una publicación aprobada se publican solas si el creador está verificado; si no, esperan revisión.
- **Acciones del servidor** (`src/lib/actions/*`): todas comprueban sesión, dueño o rol y validan cada campo. Las funciones internas que no deben poder llamarse desde el navegador viven fuera de los archivos `"use server"` (`src/lib/publishing.ts`).

## 10. Herramientas (etapa 7)

Todas en `/herramientas`. Los packs se abren del catálogo (`/api/archivo/<slug>`, mismo dominio, no cuenta como descarga) o de la computadora, y se procesan en el navegador con `fflate`.

- **Buscar por captura:** en vez del plan original (CLIP + pgvector, que necesita un servidor con GPU o un servicio externo), cada imagen se reduce a una **huella de 112 números**: histograma de 64 colores y color medio de una cuadrícula de 4×4 (`src/lib/image-features.ts`, igual a `features()` en Python para el contenido de ejemplo). Se guardan en `image_features` al subir portada o capturas. La captura del usuario no se sube: el navegador calcula su huella y solo manda el vector. El servidor las compara por coseno después de centrarlas (restar el promedio) para que el fondo oscuro común no haga que todo parezca igual. Compara colores y composición, no "entiende" la imagen.
- **Visor de texturas**, **comparador** (empareja nombres de 1.8 y 1.21 con la tabla de nombres de 1.13 de `src/lib/pack-reader.ts`), **analizador** (.zip y .jar), **conversor de versiones** (pack.mcmeta, items→item, nombres de 1.13, armaduras de 1.21.2, en ambos sentidos; avisa de lo que no convierte, como la interfaz de 1.20.2) y **personalización PvP** (cada grupo de texturas de un pack distinto, con LEEME de créditos).

## 11. Administración (etapa 8)

`/admin` (rol `admin` o `moderator`): resumen con cifras reales, *por revisar* (aprobar o rechazar con motivo), publicaciones (destacar, retirar), usuarios (verificar, suspender, roles — solo `admin`), categorías, descargas (por día, tipo, origen y versión) y reportes. Suspender retira las publicaciones y comentarios de la cuenta.

## 12. Calidad y seguridad (etapa 9)

- **Pruebas:** `npm test` (Vitest, carpeta `tests/`).
- **Cabeceras:** CSP en producción (scripts y estilos propios; imágenes y conexiones también a Supabase), HSTS, `X-Frame-Options: DENY`, `nosniff`.
- **Entrada del usuario:** el texto de descripciones y comentarios se muestra sin HTML (formato mínimo propio, enlaces con `rel="nofollow ugc"`); `?siguiente=` solo acepta rutas internas; límites de frecuencia en comentarios y reportes; los slugs, rutas de Storage y números de versión se validan con expresiones estrictas.
- **SEO:** sitemap con packs, mods, creadores, categorías y herramientas (sin contenido de ejemplo); `robots.txt` excluye cuenta, panel, administración y API.
- **Rendimiento:** caché de consultas por etiqueta, imágenes con `next/image` (AVIF/WebP), revisión de archivos que solo descomprime lo necesario, búsqueda por captura con los vectores en memoria 5 minutos.

## 13. Etapas

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | Análisis del proyecto actual | Hecha |
| 2 | Página principal | Hecha |
| 3 | Catálogo de texturas y overlays + búsqueda | Hecha |
| 4 | Página de cada recurso + descargas reales | Hecha |
| 5 | Catálogo y páginas de mods | Hecha |
| 6 | Usuarios y creadores (Supabase Auth, subidas) | Hecha |
| 7 | Herramientas (búsqueda por captura, visor, comparador, analizador, conversor, personalización) | Hecha |
| 8 | Panel de administración | Hecha |
| 9 | Pruebas, seguridad, SEO y documentación | Hecha |
