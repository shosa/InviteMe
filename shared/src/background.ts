// Sfondi animati: un livello di movimento dietro i contenuti dell'invito (confetti, bolle, onde…).
// Lo sceglie il cliente per il suo invito; il tema può proporre un predefinito nel suo theme.json.
// Solo questi tipi sono ammessi: il runtime non riceve mai codice o parametri liberi.

export const BACKGROUND_KINDS = ["none", "confetti", "bubbles", "petals", "sparkles", "waves", "snow"] as const;
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number];

export type BackgroundSpec = {
  kind: BackgroundKind;
  color?: string; // #RRGGBB: colore d'accento delle particelle; senza colore il movimento usa la tavolozza del tema
};

export const BACKGROUND_LABELS: Record<BackgroundKind, { it: string; en: string; hint: { it: string; en: string } }> = {
  none: { it: "Nessuno", en: "None", hint: { it: "Nessun movimento di sfondo.", en: "No background motion." } },
  confetti: { it: "Coriandoli", en: "Confetti", hint: { it: "Coriandoli che cadono e ruotano: festa, compleanni.", en: "Falling, spinning confetti: parties." } },
  bubbles: { it: "Bolle", en: "Bubbles", hint: { it: "Bolle che salgono e ondeggiano: battesimi, estate.", en: "Rising, swaying bubbles: christenings, summer." } },
  petals: { it: "Petali", en: "Petals", hint: { it: "Petali che scendono dolcemente: nozze, primavera.", en: "Petals drifting down: weddings, spring." } },
  sparkles: { it: "Scintille", en: "Sparkles", hint: { it: "Piccole luci che pulsano: eleganza, anniversari.", en: "Small pulsing lights: elegance, anniversaries." } },
  waves: { it: "Onde", en: "Waves", hint: { it: "Onde lente in fondo alla pagina: mare, estate.", en: "Slow waves at the bottom: sea, summer." } },
  snow: { it: "Neve", en: "Snow", hint: { it: "Fiocchi che scendono lenti: inverno, feste.", en: "Slow falling flakes: winter, holidays." } },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// Valida uno sfondo: nulla se assente o non valido. «none» è una scelta esplicita (spegne lo sfondo del tema).
export function sanitizeBackground(v: unknown): BackgroundSpec | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const kind = (BACKGROUND_KINDS as readonly string[]).includes(String(o.kind)) ? (o.kind as BackgroundKind) : undefined;
  if (!kind) return undefined;
  const color = typeof o.color === "string" && HEX.test(o.color) ? o.color.toLowerCase() : undefined;
  return kind === "none" || !color ? { kind } : { kind, color };
}
