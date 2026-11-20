export const REPORT_REASONS = {
  robo: "Es contenido robado o sin permiso del autor",
  malware: "El archivo tiene virus o algo sospechoso",
  roto: "No funciona o el archivo está dañado",
  inapropiado: "Contenido inapropiado u ofensivo",
  spam: "Spam o publicidad",
  otro: "Otro motivo",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
