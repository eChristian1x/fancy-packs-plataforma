# Fancy Packs · plataforma

Nueva versión de Fancy Packs: texturas PvP, overlays y mods para Minecraft Java, con cuentas, publicación para creadores, panel de administración y herramientas.

**En línea:** https://fancy-packs.vercel.app. Cada cambio que llega a la rama `main` de GitHub se publica solo en Vercel en uno o dos minutos.

**Estado:** las 9 etapas están hechas. Ver [ARQUITECTURA.md](ARQUITECTURA.md).

---

## Probarlo en tu PC

Necesitas **Node.js 20.12 o más nuevo** ([nodejs.org](https://nodejs.org), versión LTS).

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

La primera vez, `npm run dev` crea una base de datos local en `.data/` y carga **contenido de ejemplo**: creadores, packs y cifras inventados. La página lo marca con un aviso amarillo y la etiqueta "Ejemplo". No hace falta crear ninguna cuenta para esto.

**Modo local.** Sin las variables de Supabase, `npm run dev` simula las cuentas y el almacenamiento: en *Iniciar sesión* aparece "Entrar en modo local", donde escribes cualquier usuario (sin contraseña). El usuario `admin` es administrador (su correo es `admin@local.test`, que está en `ADMIN_EMAILS` de `.env.local`). Los archivos subidos se guardan en `.data/storage`. Esto solo existe en `next dev`; en producción el código ni siquiera se incluye.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Prepara la base y arranca en modo desarrollo |
| `npm run build` y `npm start` | Versión de producción |
| `npm run db:clear-samples` | Borra todo el contenido de ejemplo (los datos reales no se tocan) |
| `npm run db:seed` | Vuelve a cargar el contenido de ejemplo |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm test` | Pruebas (Vitest): pack.mcmeta, revisión de .zip y .jar, versiones, huella de imágenes, URLs |
| `npm run db:generate` | Crea una migración después de cambiar `src/lib/db/schema.ts` |

Para empezar de cero en local, borra la carpeta `.data/`. Las migraciones nuevas se aplican solas con `npm run dev`.

Las imágenes de ejemplo (`public/samples/`) se generan con `python3 scripts/samples/generate_covers.py public/samples`. Es pixel art propio, sin texturas de Mojang.

---

## Publicación (Supabase + Vercel)

Ya está montada así:

- **GitHub:** `eChristian1x/fancy-packs-plataforma`, rama `main`.
- **Vercel:** el proyecto `fancy-packs` publica en https://fancy-packs.vercel.app. Variables de entorno:
  - `DATABASE_URL` (sensible): conexión a Postgres.
  - `NEXT_PUBLIC_SITE_URL`: dirección del sitio, sin `/` al final.
  - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Auth y Storage (la clave es la *publishable*, es pública).
  - `ADMIN_EMAILS`: correos que entran como administradores, separados por comas.
  - `DOWNLOAD_SALT` (sensible): secreto para el hash de IP de las descargas.
- **Supabase:** el proyecto `fancy-packs` (ref `bwpribnkiloppvaagdqn`, región us-east-1). La app se conecta por el *transaction pooler* (`aws-1-us-east-1.pooler.supabase.com:6543`) con el usuario `fancy_app`, que solo puede leer y escribir datos (no puede crear tablas) y tiene políticas RLS propias.
- **Storage:** buckets `archivos` (.zip/.jar, 50 MB) e `imagenes` (8 MB), de lectura pública; cada usuario solo escribe en su carpeta. Se crean con [`supabase/storage.sql`](supabase/storage.sql).
- **Contenido de ejemplo:** está cargado en Supabase para revisar el sitio. En *Administración → Resumen* hay un botón para cargarle galerías y archivos de prueba y otro para borrarlo todo.

### Ajustes de Supabase Auth que se hacen a mano

En el panel de Supabase, *Authentication*:

1. **URL Configuration → Site URL:** `https://fancy-packs.vercel.app`. En *Redirect URLs* agrega `https://fancy-packs.vercel.app/auth/callback`. Sin esto, los enlaces de los correos (confirmar cuenta, recuperar contraseña) llevan a `localhost`.
2. **Correos (SMTP):** el correo que trae Supabase solo manda mensajes a los miembros del equipo del proyecto y unos pocos por hora. Para que cualquiera pueda registrarse, configura un SMTP propio en *Emails → SMTP Settings* (por ejemplo [Resend](https://resend.com), que tiene plan gratis), o desactiva *Confirm email* en *Sign In / Providers → Email* si prefieres que las cuentas entren sin confirmar el correo.

Para montarlo desde cero en otra cuenta:

1. **Supabase.** Crea un proyecto en [supabase.com](https://supabase.com). En *Project Settings → Database → Connection string* copia la de **Transaction pooler**.
2. **Base de datos.** En tu PC crea un archivo `.env` (copia `.env.example`), pega esa cadena en `DATABASE_URL` y corre `npm run db:setup`. Eso crea las tablas, las categorías y las versiones de Minecraft. El contenido de ejemplo **no** se carga en Supabase, salvo que corras `npm run db:seed`.
3. **Storage.** En el editor SQL de Supabase corre [`supabase/storage.sql`](supabase/storage.sql).
4. **Auth.** Haz los ajustes de la sección anterior.
5. **Vercel.** Importa el repositorio en [vercel.com](https://vercel.com) y agrega las variables de la lista de arriba.

Todas las tablas tienen RLS activado y la API pública de Supabase no puede leerlas ni escribirlas: solo el servidor de la app tiene acceso (con el usuario de `DATABASE_URL`).

---

## El mod "Fancy Packs · Texturas"

El mod lee `/api/v1/packs.json`. Esta plataforma la mantiene con **el mismo formato** que generaba `scripts/build.py` en el sitio anterior, con las mismas etiquetas de modalidad (`netherite`, `sword`, `crystal`…).

- El contenido de ejemplo **nunca** aparece en esa lista.
- Las descargas del mod (`packs/<slug>/<archivo>.zip`) se cuentan como "mod" y se sirven directamente, sin redirección.

## Licencias

- Código: MIT.
- Fuente Archivo: SIL Open Font License (`src/app/fonts/OFL-archivo.txt`).
- Logo e iconos pixel de modalidades: del sitio anterior de Fancy Packs.
