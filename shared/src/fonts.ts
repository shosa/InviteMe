// Libreria dei font per i testi dell'invito: Google Fonts, licenza SIL Open Font License (libera anche per uso commerciale).
// Solo questi id sono ammessi: il cliente sceglie da qui, il CSS non riceve mai un nome di font libero.

export type FontCategory = "serif" | "sans" | "script";

export const FONT_LIBRARY = [
  { id: "Cormorant Garamond", category: "serif", spec: "Cormorant+Garamond:wght@400;700" },
  { id: "Playfair Display", category: "serif", spec: "Playfair+Display:wght@400;700" },
  { id: "Lora", category: "serif", spec: "Lora:wght@400;700" },
  { id: "Libre Baskerville", category: "serif", spec: "Libre+Baskerville:wght@400;700" },
  { id: "Bodoni Moda", category: "serif", spec: "Bodoni+Moda:wght@400;700" },
  { id: "Cinzel", category: "serif", spec: "Cinzel:wght@400;700" },
  { id: "Montserrat", category: "sans", spec: "Montserrat:wght@300;400;700" },
  { id: "Raleway", category: "sans", spec: "Raleway:wght@300;400;700" },
  { id: "Lato", category: "sans", spec: "Lato:wght@300;400;700" },
  { id: "Josefin Sans", category: "sans", spec: "Josefin+Sans:wght@300;400;700" },
  { id: "Poppins", category: "sans", spec: "Poppins:wght@300;400;700" },
  { id: "Great Vibes", category: "script", spec: "Great+Vibes" },
  { id: "Dancing Script", category: "script", spec: "Dancing+Script:wght@400;700" },
  { id: "Parisienne", category: "script", spec: "Parisienne" },
  { id: "Allura", category: "script", spec: "Allura" },
] as const satisfies readonly { id: string; category: FontCategory; spec: string }[];

export type FontId = (typeof FONT_LIBRARY)[number]["id"];

const FALLBACK: Record<FontCategory, string> = { serif: "Georgia, serif", sans: "system-ui, sans-serif", script: "cursive" };

export function isFontId(v: unknown): v is FontId {
  return typeof v === "string" && FONT_LIBRARY.some((f) => f.id === v);
}

// Lo stack CSS di un font della libreria; per un id sconosciuto nulla (il testo resta com'è).
export function fontStack(id: string): string | undefined {
  const f = FONT_LIBRARY.find((x) => x.id === id);
  return f ? `'${f.id}', ${FALLBACK[f.category]}` : undefined;
}

// Il foglio di stile Google con i font richiesti (o tutta la libreria). Nessun dato libero entra nell'indirizzo.
export function fontsStylesheetUrl(ids?: readonly string[]): string {
  const list = FONT_LIBRARY.filter((f) => !ids || ids.includes(f.id));
  return `https://fonts.googleapis.com/css2?${list.map((f) => `family=${f.spec}`).join("&")}&display=swap`;
}

// Mappa campo → font, solo per i campi indicati e solo con id della libreria. Vuota = nessuna mappa.
export function sanitizeFontMap(keys: readonly string[], v: unknown): Record<string, FontId> | undefined {
  if (!v || typeof v !== "object") return undefined;
  const src = v as Record<string, unknown>;
  const out: Record<string, FontId> = {};
  for (const k of keys) if (isFontId(src[k])) out[k] = src[k];
  return Object.keys(out).length > 0 ? out : undefined;
}
