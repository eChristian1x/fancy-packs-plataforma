# Fancy Packs · plataforma

Nueva versión de Fancy Packs: texturas PvP, overlays y mods para Minecraft Java, con base de datos, y más adelante cuentas y subidas de creadores.

Esta carpeta es un proyecto nuevo y no reemplaza al sitio anterior (`fancy-packs/`). Ese sitio puede seguir publicado en GitHub Pages hasta que esta plataforma tenga descargas reales (etapa 4).

**Estado:** etapas 1 a 3 terminadas: análisis, página principal y catálogo de texturas y overlays con búsqueda. Ver [ARQUITECTURA.md](ARQUITECTURA.md).

---

## Probarlo en tu PC

Necesitas **Node.js 20.12 o más nuevo** ([nodejs.org](https://nodejs.org), versión LTS).

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

La primera vez, `npm run dev` crea una base de datos local en `.data/` y carga **contenido de ejemplo**: creadores, packs y cifras inventados. La página lo marca con un aviso amarillo y la etiqueta "Ejemplo". No hace falta crear ninguna cuenta para esto.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Prepara la base y arranca en modo desarrollo |
| `npm run build` y `npm start` | Versión de producción |
| `npm run db:clear-samples` | Borra todo el contenido de ejemplo (los datos reales no se tocan) |
| `npm run db:seed` | Vuelve a cargar el contenido de ejemplo |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run db:generate` | Crea una migración después de cambiar `src/lib/db/schema.ts` |

Para empezar de cero en local, borra la carpeta `.data/`. Las migraciones nuevas se aplican solas con `npm run dev`.

Las imágenes de ejemplo (`public/samples/`) se generan con `python3 scripts/samples/generate_covers.py public/samples`. Es pixel art propio, sin texturas de Mojang.

---

## Publicarlo (Supabase + Vercel)

Todavía no hace falta: conviene hacerlo cuando estén las etapas 3 y 4. Cuando toque:

1. **Supabase.** Crea un proyecto en [supabase.com](https://supabase.com). En *Project Settings → Database → Connection string* copia la de **Transaction pooler**.
2. **Base de datos.** En tu PC crea un archivo `.env` (copia `.env.example`), pega esa cadena en `DATABASE_URL` y corre `npm run db:setup`. Eso crea las tablas, las categorías y las versiones de Minecraft. El contenido de ejemplo **no** se carga en Supabase, salvo que corras `npm run db:seed`.
3. **Vercel.** Importa el repositorio en [vercel.com](https://vercel.com) y agrega las variables `DATABASE_URL` y `NEXT_PUBLIC_SITE_URL` (la dirección final del sitio, sin `/` al final).

Todas las tablas tienen RLS activado y sin políticas. Así, la API pública de Supabase no puede leerlas ni escribirlas, y solo el servidor de la app tiene acceso.

---

## El mod "Fancy Packs · Texturas"

El mod lee `/api/v1/packs.json`. Esta plataforma la mantiene con **el mismo formato** que generaba `scripts/build.py` en el sitio anterior, con las mismas etiquetas de modalidad (`netherite`, `sword`, `crystal`…).

- El contenido de ejemplo **nunca** aparece en esa lista.
- No cambies la dirección que usa el mod hasta que esta plataforma tenga packs reales y descargas (etapa 4).

## Licencias

- Código: MIT.
- Fuente Archivo: SIL Open Font License (`src/app/fonts/OFL-archivo.txt`).
- Logo e iconos pixel de modalidades: del sitio anterior de Fancy Packs.
