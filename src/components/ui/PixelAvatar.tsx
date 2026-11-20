/**
 * Avatar pixel 8×8 simétrico generado a partir del nombre de usuario.
 * Se usa mientras el creador no suba su foto (etapa 6).
 */
const COLORS = ["#ff6fb1", "#ffd447", "#fff6fa", "#c77dff", "#5ee0a8", "#7cc8ff", "#ff9f6b"];
const BG = ["#2a2031", "#33283c", "#241a2b"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function PixelAvatar({ seed, size = 40, className }: { seed: string; size?: number; className?: string }) {
  let h = hash(seed.toLowerCase());
  const next = () => (h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0);
  const fg = COLORS[next() % COLORS.length];
  const fg2 = COLORS[(next() % (COLORS.length - 1) + COLORS.indexOf(fg) + 1) % COLORS.length];
  const bg = BG[next() % BG.length];
  const cells: React.ReactNode[] = [];
  for (let y = 1; y < 7; y++) {
    for (let x = 1; x < 4; x++) {
      const v = next() % 10;
      if (v < 5) continue;
      const c = v < 8 ? fg : fg2;
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c} />);
      cells.push(<rect key={`${7 - x}-${y}`} x={7 - x} y={y} width="1" height="1" fill={c} />);
    }
  }
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect width="8" height="8" fill={bg} />
      {cells}
    </svg>
  );
}
