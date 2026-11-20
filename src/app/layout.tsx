import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { NavProgress } from "@/components/layout/NavProgress";
import { SampleNotice } from "@/components/layout/SampleNotice";
import { getSessionUser, isStaff } from "@/lib/auth/session";
import { getSiteInfo, getStats, type SiteInfo } from "@/lib/queries/resources";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const archivo = localFont({
  src: "./fonts/archivo-wdth.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

// Todas las páginas leen la base de datos (con caché de 60 s en cada consulta).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Fancy Packs · Texturas PvP, overlays y mods para Minecraft", template: "%s · Fancy Packs" },
  description:
    "Descarga texturas PvP, overlays y mods para Minecraft Java. Filtra por versión, resolución y modalidad: Sword, NethPot, Crystal, UHC, SMP y más.",
  applicationName: "Fancy Packs",
  icons: { icon: "/brand/favicon.png", apple: "/brand/icon.png" },
  openGraph: { type: "website", siteName: "Fancy Packs", locale: "es_MX", images: ["/brand/logo.png"] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#15101a",
  colorScheme: "dark",
};

const FALLBACK_SITE: SiteInfo = { name: "Fancy Packs", tagline: "Texturas PvP, overlays y mods para Minecraft Java", contact: "" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Si la base no responde, la página sigue mostrando la navegación y el error de cada sección.
  const [site, stats, user] = await Promise.all([
    getSiteInfo().catch(() => FALLBACK_SITE),
    getStats().catch(() => null),
    getSessionUser().catch(() => null),
  ]);
  const navUser = user ? { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, staff: isStaff(user) } : null;

  return (
    <html lang="es-MX" className={archivo.variable}>
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <a href="#contenido" className="saltar">
          Saltar al contenido
        </a>
        {stats?.hasSamples && <SampleNotice />}
        <Navbar user={navUser} />
        <main id="contenido">{children}</main>
        <Footer site={site} />
      </body>
    </html>
  );
}
