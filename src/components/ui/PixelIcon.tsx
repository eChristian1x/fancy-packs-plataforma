/**
 * Iconos pixel 12×12 de las modalidades. Vienen del sitio anterior (dibujados a mano,
 * no son texturas de Minecraft). Cada letra es un color de PCOL.
 */
const PIXELS: Record<string, string[]> = {
  populares: ["....YY......", "....YY......", "...YYYY.....", "YYYYYYYYYY..", ".YYYYYYYY...", "..YYYYYY....", "..YYYYYY....",
    ".YYY..YYY...", ".YY....YY...", "............", "............", "............"],
  netherite: ["............", "...DDDDDD...", "..DPPPPPPD..", ".DPDDDDDDPD.", ".DPD....DPD.", ".DPD....DPD.", ".DDD....DDD.", "............"],
  sword: ["..........WW", ".........WGW", "........WGW.", ".......WGW..", "......WGW...", "..B..WGW....", "...BWGW.....", "....BW......",
    "...BNB......", "..NN.B......", ".NN.........", "............"],
  crystal: ["....PP......", "...PMMP.....", "..PMWMMP....", ".PMMMMMMP...", "..PMMMMP....", "...PMMP.....", "....PP......", "............"],
  uhc: ["....N.......", "....NL......", "..YYYYYY....", ".YYWYYYYY...", ".YWYYYYYY...", ".YYYYYYYY...", ".YYYYYYYY...", "..YYYYYY....", "...Y..Y....."],
  smp: ["GGGGGGGGGG..", "GLGGGLGGLG..", "NGNNGNNGNN..", "NNNNNNNNNN..", "NNONNNNONN..", "NNNNNNNNNN..", "NONNNONNNN..", "NNNNNNNNNN.."],
  boxpvp: ["OOOOOOOOOO..", "ONNNNNNNNO..", "ONOOOOOONO..", "ONOOOOOONO..", "ONNNNNNNNO..", "ONOOOOOONO..", "ONNNNNNNNO..", "OOOOOOOOOO.."],
  tridente: ["C...C...C...", "C...C...C...", "CC..C..CC...", ".CCCCCCC....", "....C.......", "....C.......", "....C.......", "....C.......", "....C......."],
  mazo: [".SSSS.......", "SSKSSS......", "SSSSKS......", "SKSSSS......", ".SSSS.......", "...BN.......", "....BN......", ".....BN.....", "......BN....", ".......B...."],
};

const PCOL: Record<string, string> = {
  Y: "#ffd447", D: "#4a4150", P: "#c77dff", M: "#ff7bd1", W: "#ffffff", G: "#3fdc8a", B: "#6b4a2b", N: "#8a5a32",
  L: "#9ff26a", O: "#5a3a1e", C: "#3fe0e8", S: "#b3bcc6", K: "#5c636b",
};

/** Recorta filas/columnas vacías para centrar cada dibujo en su casilla. */
function bounds(rows: string[]) {
  let x0 = 12, x1 = -1, y0 = 12, y1 = -1;
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (PCOL[ch]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }));
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function hasPixelIcon(name: string | null | undefined): name is string {
  return !!name && name in PIXELS;
}

export function PixelIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const rows = PIXELS[name];
  if (!rows) return null;
  const b = bounds(rows);
  const side = Math.max(b.w, b.h);
  const ox = b.x0 - (side - b.w) / 2;
  const oy = b.y0 - (side - b.h) / 2;
  const rects: React.ReactNode[] = [];
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (PCOL[ch]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={PCOL[ch]} />);
    }),
  );
  return (
    <svg viewBox={`${ox} ${oy} ${side} ${side}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {rects}
    </svg>
  );
}
