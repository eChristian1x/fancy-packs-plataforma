"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {
          /* el navegador no dejó copiar */
        }
      }}
      aria-label={ok ? "Copiado" : label}
      title={ok ? "Copiado" : label}
    >
      <Icon name={ok ? "check" : "texture"} size={15} />
    </button>
  );
}
