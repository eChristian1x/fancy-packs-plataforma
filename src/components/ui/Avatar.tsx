import { PixelAvatar } from "./PixelAvatar";

/** Foto del usuario si la subió; si no, su avatar pixel generado. */
export function Avatar({ seed, src, size = 40, className }: { seed: string; src?: string | null; size?: number; className?: string }) {
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} className={className} style={{ borderRadius: 4, objectFit: "cover", imageRendering: "auto" }} loading="lazy" />
    );
  return <PixelAvatar seed={seed} size={size} className={className} />;
}
