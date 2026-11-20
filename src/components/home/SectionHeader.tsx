import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import styles from "./SectionHeader.module.css";

export function SectionHeader({
  id,
  title,
  description,
  action,
  size = "m",
}: {
  size?: "m" | "s";
  id: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className={styles.cabecera} data-size={size}>
      <div>
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className={styles.accion}>
          {action.label}
          <Icon name="chevronRight" size={16} />
        </Link>
      )}
    </header>
  );
}
