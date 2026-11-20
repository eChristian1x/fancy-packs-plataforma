/**
 * Huella visual de una imagen para "Buscar por captura".
 *
 * 1. La imagen se reduce a 256×256 y luego a 32×32 promediando bloques de 8×8.
 * 2. Histograma de 64 colores (4 niveles por canal), con raíz cuadrada (distancia de Hellinger).
 * 3. Color medio de una cuadrícula de 4×4 (forma general de la imagen), con peso 0.5.
 * 4. Vector normalizado: se compara con similitud de coseno (producto punto).
 *
 * Compara colores y composición; no "entiende" la imagen. Debe coincidir con
 * features() de scripts/samples/generate_covers.py, que calcula las huellas de ejemplo.
 */
export const FEATURE_SIZE = 64 + 48;

/** rgba: 256×256 píxeles RGBA (de un canvas). */
export function featuresFromRgba256(rgba: Uint8ClampedArray | Uint8Array): number[] {
  if (rgba.length !== 256 * 256 * 4) throw new Error("Se esperaban 256×256 píxeles RGBA");
  const small = new Float64Array(32 * 32 * 3);
  for (let by = 0; by < 32; by++)
    for (let bx = 0; bx < 32; bx++) {
      let r = 0, g = 0, b = 0;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const i = ((by * 8 + y) * 256 + (bx * 8 + x)) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
        }
      const o = (by * 32 + bx) * 3;
      small[o] = r / 64;
      small[o + 1] = g / 64;
      small[o + 2] = b / 64;
    }
  const hist = new Float64Array(64);
  for (let i = 0; i < 32 * 32; i++) {
    const q = (c: number) => Math.min(255, Math.max(0, Math.round(small[i * 3 + c])));
    hist[(q(0) >> 6) * 16 + (q(1) >> 6) * 4 + (q(2) >> 6)] += 1 / 1024;
  }
  const grid: number[] = [];
  for (let gy = 0; gy < 4; gy++)
    for (let gx = 0; gx < 4; gx++) {
      let r = 0, g = 0, b = 0;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const o = ((gy * 8 + y) * 32 + (gx * 8 + x)) * 3;
          r += small[o];
          g += small[o + 1];
          b += small[o + 2];
        }
      grid.push(r / 64 / 255, g / 64 / 255, b / 64 / 255);
    }
  const v = [...Array.from(hist, Math.sqrt), ...grid.map((x) => x * 0.5)];
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export function cosine(a: readonly number[], b: readonly number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

/** En el navegador: huella de un archivo de imagen o de un <img> ya cargado. */
export async function featuresFromImageSource(src: Blob | HTMLImageElement): Promise<number[]> {
  const bmp = src instanceof Blob ? await createImageBitmap(src) : src;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, 256, 256);
  return featuresFromRgba256(ctx.getImageData(0, 0, 256, 256).data);
}
