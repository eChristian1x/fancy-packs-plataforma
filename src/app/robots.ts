import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/panel", "/cuenta", "/entrar", "/registro", "/recuperar", "/reportar", "/descargar/", "/auth/", "/dev/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
