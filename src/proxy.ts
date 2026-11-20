import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renueva la sesión de Supabase (cookies) antes de cada página. Si el visitante no tiene
 * cookies de sesión no hace nada: las visitas anónimas no esperan ninguna llamada extra.
 */
export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser().catch(() => null);
  return res;
}

export const config = {
  // Páginas y acciones; no archivos estáticos, imágenes, descargas ni la API del mod.
  matcher: ["/((?!_next/static|_next/image|samples/|api/v1/|packs/|descargar/|favicon|icon|apple-icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|zip|jar|woff2?)$).*)"],
};
