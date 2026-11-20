import { FEATURE_SIZE } from "@/lib/image-features";
import { searchByVector } from "@/lib/queries/tools";

export const dynamic = "force-dynamic";

/**
 * Buscar por captura. El navegador calcula la huella de la imagen (no se sube la captura)
 * y manda solo el vector: { vector: number[112] }.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Petición no válida." }, { status: 400 });
  }
  const v = (body as { vector?: unknown })?.vector;
  if (!Array.isArray(v) || v.length !== FEATURE_SIZE || !v.every((x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= 1))
    return Response.json({ error: "Huella de imagen no válida." }, { status: 400 });
  try {
    const results = await searchByVector(v as number[], 12);
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[buscar-imagen]", e);
    return Response.json({ error: "No se pudo buscar. Intenta de nuevo." }, { status: 500 });
  }
}
