import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // PGlite trae archivos .wasm: se carga desde node_modules en vez de empaquetarse.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Imágenes subidas a Supabase Storage (etapa 6)
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
