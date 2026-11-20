import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { compactNumber, fullNumber } from "@/lib/format";
import { categoryHref, creatorHref, LOADER_LABEL } from "@/lib/routes";
import type { ResourceCard } from "@/lib/queries/resources";
import { versionRange } from "@/lib/versions";
import styles from "./parts.module.css";

export function Downloads({ n, className }: { n: number; className?: string }) {
  return (
    <span className={`${styles.descargas} num ${className ?? ""}`} title={`${fullNumber(n)} descargas`}>
      <Icon name="download" size={15} />
      {compactNumber(n)}
      <span className="solo-lectores"> descargas</span>
    </span>
  );
}

export function Versions({ list, className }: { list: string[]; className?: string }) {
  if (!list.length) return null;
  return (
    <span className={`${styles.versiones} ${className ?? ""}`} title={`Minecraft ${[...list].join(", ")}`}>
      <Icon name="versions" size={15} />
      <span className="solo-lectores">Minecraft </span>
      {versionRange(list)}
    </span>
  );
}

export function Author({ r, className }: { r: Pick<ResourceCard, "authorName" | "ownerUsername">; className?: string }) {
  return (
    <p className={`${styles.autor} ${className ?? ""}`}>
      de{" "}
      <Link href={creatorHref(r.ownerUsername)} className={styles.encima}>
        {r.authorName}
      </Link>
    </p>
  );
}

export function CategoryChips({ r, max = 3 }: { r: Pick<ResourceCard, "type" | "categories">; max?: number }) {
  if (!r.categories.length) return null;
  return (
    <ul className={styles.chips} aria-label="Categorías">
      {r.categories.slice(0, max).map((c) => (
        <li key={c.slug}>
          <Link href={categoryHref(r.type, c.slug)} className={`chip ${styles.encima}`}>
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const LOADER_COLOR: Record<string, string> = {
  fabric: "#dbc7a0",
  forge: "#8ea7d6",
  neoforge: "#f5a46a",
  quilt: "#c99bff",
};

export function Loaders({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <ul className={styles.loaders} aria-label="Loaders compatibles">
      {list.map((l) => (
        <li key={l} className="chip" style={{ ["--c" as string]: LOADER_COLOR[l] ?? "var(--texto-2)" }}>
          {LOADER_LABEL[l] ?? l}
        </li>
      ))}
    </ul>
  );
}

export function SampleTag() {
  return <span className={styles.ejemplo}>Ejemplo</span>;
}
