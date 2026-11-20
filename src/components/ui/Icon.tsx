/** Iconos de línea propios (24×24, trazo 1.8). Uno solo para toda la interfaz. */
const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  download: <><path d="M12 4v11" /><path d="m7 10.5 5 5 5-5" /><path d="M5 19.5h14" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" /></>,
  chevronRight: <path d="m10 6 6 6-6 6" />,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  versions: <><path d="M4 8.5 12 4l8 4.5-8 4.5z" /><path d="m4 12.5 8 4.5 8-4.5" /><path d="m4 16.5 8 4.5 8-4.5" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  star: <path d="m12 4 2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7z" />,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  texture: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 12h16M12 4v16" /></>,
  overlay: <><rect x="3.5" y="7.5" width="13" height="13" rx="1.5" /><path d="M7.5 7.5V4.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-3" /></>,
  mod: <><path d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8z" /><path d="m4.5 8 7.5 4.5L19.5 8M12 12.5v8" /></>,
  tools: <><path d="M14.5 5.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9" /><path d="M14.5 5.5 17 3" /></>,
  users: <><circle cx="9" cy="9" r="3.3" /><path d="M3 19c.9-3 3.1-4.5 6-4.5s5.1 1.5 6 4.5" /><path d="M15.5 5.8a3.2 3.2 0 0 1 0 6.3M17.5 14.7c1.8.6 3 2 3.5 4.3" /></>,
  home: <><path d="M4 11 12 4.5 20 11" /><path d="M6 9.5V20h12V9.5" /></>,
  alert: <><path d="M12 4 21 19.5H3z" /><path d="M12 10v4M12 16.8v.2" /></>,
  heart: <path d="M12 19.5s-7.5-4.4-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.2-7.5 9.6-7.5 9.6z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  filter: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
