"use client";

import { useMemo, useState } from "react";
import { texturesOf, type LoadedPack } from "@/lib/pack-reader";
import { PackPicker } from "./PackPicker";
import { TextureGrid } from "./TextureGrid";
import styles from "./Tools.module.css";

export function TextureViewer() {
  const [pack, setPack] = useState<LoadedPack | null>(null);
  const textures = useMemo(() => (pack ? texturesOf(pack) : []), [pack]);
  return (
    <>
      <PackPicker label="Pack para ver" onLoad={(p) => setPack(p)} />
      {pack && (
        <>
          {pack.metaError && <p className={styles.aviso}>{pack.metaError}</p>}
          {textures.length === 0 ? <p className={styles.nota}>Este pack no tiene texturas PNG dentro de assets/.</p> : <TextureGrid pack={pack} textures={textures} />}
        </>
      )}
    </>
  );
}
