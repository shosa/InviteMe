// Tema: un unico file JSON che contiene tutto lo stile di un invito.
// Dentro ci sono: colori, tipografia, forma della cornice, layout, animazioni, CSS dell'invito,
// eventuale font e una traccia audio di default. Nessuna dipendenza esterna: il file basta da solo.
// Formato: vedi docs/THEMES.md. Ogni tema caricato passa sempre da validateTheme.

export const THEME_SCHEMA = 2;

export const THEME_MODELS = ["save-the-date", "invitation-rsvp"] as const;
const DISPLAY_FONTS = ["bodoni", "georgia", "custom"] as const;
const TEXT_FONTS = ["grotesk", "georgia"] as const;
const FRAMES = ["arch", "rect", "oval"] as const;
const LAYOUTS = ["centered", "editorial"] as const;
const COVERS = ["envelope", "none"] as const;
const REVEALS = ["fade", "rise", "none"] as const;

const MAX_CSS = 20_000;
const MAX_FONT_B64 = 400_000;
const MAX_AUDIO_B64 = 2_600_000;

export type ThemePalette = { paper: string; ink: string; accent: string; muted: string; line: string };
export type ThemeTypography = { display: (typeof DISPLAY_FONTS)[number]; text: (typeof TEXT_FONTS)[number] };
export type ThemeShape = { frame: (typeof FRAMES)[number]; radius: number };
export type ThemeMotion = { cover: (typeof COVERS)[number]; reveal: (typeof REVEALS)[number] };
export type ThemeFont = { family: string; src: string } | null;

// Manifest completo di un tema. I campi flat (bg, ink, accent, font) sono derivati, usati dai componenti.
export type StyleDef = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  builtin: boolean;
  models: string[];
  palette: ThemePalette;
  typography: ThemeTypography;
  shape: ThemeShape;
  layout: (typeof LAYOUTS)[number];
  motion: ThemeMotion;
  css: string; // CSS dell'invito, già limitato a questo tema
  font: ThemeFont; // font incorporato (data URL), se il tema ne usa uno
  music: { defaultTrackId: string | null; file: string | null }; // file: audio incorporato (data URL)
  bg: string;
  ink: string;
  accent: string;
  fontKind: "serif" | "sans";
};

const KEYS = ["schema", "id", "name", "description", "models", "palette", "typography", "shape", "layout", "motion", "css", "font", "music"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T, errors: string[], field: string): T {
  if (v === undefined) return fallback;
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  errors.push(`${field}: valore non ammesso (${String(v)}). Ammessi: ${allowed.join(", ")}`);
  return fallback;
}

function hex(v: unknown, field: string, errors: string[], fallback: string): string {
  if (v === undefined) return fallback;
  if (typeof v === "string" && HEX.test(v)) return v;
  errors.push(`${field}: serve un colore esadecimale #RRGGBB`);
  return fallback;
}

// Il CSS del tema deve essere sicuro e isolato: niente import, niente URL esterni, niente script.
function checkCss(css: string, id: string, errors: string[]): string {
  if (css.length > MAX_CSS) errors.push(`css: massimo ${MAX_CSS} caratteri`);
  if (/@import|@font-face|expression\(|behavior\s*:|javascript:|<|<\/style/i.test(css)) errors.push("css: contiene una regola non ammessa (@import, @font-face, expression, behavior, javascript o caratteri <)");
  for (const m of css.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi)) {
    if (!m[2].startsWith("data:image/")) errors.push("css: url() ammesso solo con data:image/");
  }
  for (const m of css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)) {
    if (!m[1].startsWith(`${id}-`)) errors.push(`css: il keyframe "${m[1]}" deve iniziare con "${id}-"`);
  }
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  for (const ch of noComments) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) errors.push("css: parentesi graffe non bilanciate");
  return css.trim();
}

// Valida un manifest di tema. Ritorna il tema completo oppure la lista degli errori.
export function validateTheme(input: unknown): { theme: StyleDef | null; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return { theme: null, errors: ["il tema deve essere un oggetto JSON"] };
  const x = input as Record<string, unknown>;

  for (const k of Object.keys(x)) if (!KEYS.includes(k)) errors.push(`campo sconosciuto: ${k}`);
  if (x.schema !== THEME_SCHEMA) errors.push(`schema: deve essere ${THEME_SCHEMA}`);

  const id = typeof x.id === "string" && /^[a-z0-9-]{2,40}$/.test(x.id) ? x.id : null;
  if (!id) errors.push("id: solo minuscole, numeri e trattini, da 2 a 40 caratteri");
  const name = typeof x.name === "string" && x.name.trim().length >= 1 && x.name.length <= 60 ? x.name.trim() : null;
  if (!name) errors.push("name: testo da 1 a 60 caratteri");
  const description = typeof x.description === "string" ? x.description.slice(0, 200) : "";

  const models = Array.isArray(x.models) ? x.models.filter((m): m is string => typeof m === "string") : [...THEME_MODELS];
  for (const m of models) if (!(THEME_MODELS as readonly string[]).includes(m)) errors.push(`models: modello non ammesso (${m})`);

  if (!x.palette || typeof x.palette !== "object") errors.push("palette: obbligatoria");
  const pal = (x.palette ?? {}) as Record<string, unknown>;
  const paper = hex(pal.paper, "palette.paper", errors, "#F8F9F5");
  const ink = hex(pal.ink, "palette.ink", errors, "#17242A");
  const accent = hex(pal.accent, "palette.accent", errors, "#9A7433");
  const muted = hex(pal.muted, "palette.muted", errors, ink);
  const line = hex(pal.line, "palette.line", errors, "#C9CFC7");

  // Font incorporato: obbligatorio se la tipografia display è "custom".
  let font: ThemeFont = null;
  if (x.font !== undefined && x.font !== null) {
    const f = x.font as Record<string, unknown>;
    const family = typeof f.family === "string" && /^[A-Za-z0-9 _-]{1,40}$/.test(f.family) ? f.family : null;
    const src = typeof f.src === "string" ? f.src : "";
    if (!family) errors.push("font.family: nome da 1 a 40 caratteri (lettere, numeri, spazi)");
    if (!/^data:font\/(woff2|woff|ttf);base64,[A-Za-z0-9+/=]+$/.test(src) || src.length > MAX_FONT_B64) errors.push("font.src: data URL base64 di un font woff2, woff o ttf, massimo 400 KB");
    if (family && src) font = { family, src };
  }

  const typ = (x.typography ?? {}) as Record<string, unknown>;
  const display = pick(typ.display, DISPLAY_FONTS, "bodoni", errors, "typography.display");
  if (display === "custom" && !font) errors.push("typography.display = custom richiede un font incorporato in font");
  const text = pick(typ.text, TEXT_FONTS, "grotesk", errors, "typography.text");

  const sh = (x.shape ?? {}) as Record<string, unknown>;
  const frame = pick(sh.frame, FRAMES, "arch", errors, "shape.frame");
  const radiusRaw = sh.radius === undefined ? 0 : Number(sh.radius);
  const radius = Number.isFinite(radiusRaw) && radiusRaw >= 0 && radiusRaw <= 60 ? Math.round(radiusRaw) : 0;
  if (sh.radius !== undefined && (!Number.isFinite(radiusRaw) || radiusRaw < 0 || radiusRaw > 60)) errors.push("shape.radius: numero da 0 a 60");

  const layout = pick(x.layout, LAYOUTS, "centered", errors, "layout");
  const mo = (x.motion ?? {}) as Record<string, unknown>;
  const cover = pick(mo.cover, COVERS, "envelope", errors, "motion.cover");
  const reveal = pick(mo.reveal, REVEALS, "fade", errors, "motion.reveal");

  const css = typeof x.css === "string" ? checkCss(x.css, id ?? "tema", errors) : "";
  if (x.css !== undefined && typeof x.css !== "string") errors.push("css: testo");

  const mu = (x.music ?? {}) as Record<string, unknown>;
  const defaultTrackId = typeof mu.defaultTrackId === "string" ? mu.defaultTrackId : null;
  let file: string | null = null;
  if (typeof mu.file === "string") {
    if (/^data:audio\/(mpeg|mp4|ogg);base64,[A-Za-z0-9+/=]+$/.test(mu.file) && mu.file.length <= MAX_AUDIO_B64) file = mu.file;
    else errors.push("music.file: data URL base64 di un audio mp3, m4a o ogg, massimo circa 2 MB");
  }

  if (errors.length || !id || !name) return { theme: null, errors };
  return {
    theme: {
      id,
      name,
      description,
      enabled: true,
      builtin: false,
      models,
      palette: { paper, ink, accent, muted, line },
      typography: { display, text },
      shape: { frame, radius },
      layout,
      motion: { cover, reveal },
      css,
      font,
      music: { defaultTrackId, file },
      bg: paper,
      ink,
      accent,
      fontKind: text === "grotesk" ? "sans" : "serif",
    },
    errors: [],
  };
}

// Temi preimpostati: tre mondi visivi distinti, completi di forma, tipografia, animazioni e musica.
const BUILTIN_SOURCES: Record<string, unknown>[] = [
  {
    schema: THEME_SCHEMA,
    id: "carta",
    name: "Carta",
    description: "Carta avorio, cornice ad arco, busta sigillata. Il tema di base.",
    models: ["save-the-date", "invitation-rsvp"],
    palette: { paper: "#F8F9F5", ink: "#17242A", accent: "#9A7433", muted: "#56656B", line: "#C9CFC7" },
    typography: { display: "bodoni", text: "grotesk" },
    shape: { frame: "arch", radius: 0 },
    layout: "centered",
    motion: { cover: "envelope", reveal: "fade" },
  },
  {
    schema: THEME_SCHEMA,
    id: "notte",
    name: "Notte",
    description: "Fondo inchiostro, cornice a filo, busta e rivelazione dal basso. Per serate formali.",
    models: ["save-the-date", "invitation-rsvp"],
    palette: { paper: "#17242A", ink: "#F3EFE6", accent: "#C9A46A", muted: "#A7B1B5", line: "#33434A" },
    typography: { display: "bodoni", text: "grotesk" },
    shape: { frame: "rect", radius: 2 },
    layout: "editorial",
    motion: { cover: "envelope", reveal: "rise" },
  },
  {
    schema: THEME_SCHEMA,
    id: "rosa",
    name: "Rosa",
    description: "Rosa cipria, cornice ovale, tipografia classica. Per feste e compleanni.",
    models: ["save-the-date", "invitation-rsvp"],
    palette: { paper: "#F3E4DE", ink: "#3A2328", accent: "#8A3B4A", muted: "#6B4B52", line: "#D9B9B2" },
    typography: { display: "georgia", text: "grotesk" },
    shape: { frame: "oval", radius: 50 },
    layout: "centered",
    motion: { cover: "none", reveal: "rise" },
  },
];

export const BUILTIN_THEMES: StyleDef[] = BUILTIN_SOURCES.map((src) => {
  const r = validateTheme(src);
  if (!r.theme) throw new Error(`tema preimpostato non valido: ${String(src.id)} ${r.errors.join("; ")}`);
  return { ...r.theme, builtin: true };
});

// Prefissa ogni selettore con lo scope del tema, così il CSS non tocca nient'altro della pagina.
export function scopeThemeCss(css: string, scope: string): string {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") depth--;
      j++;
    }
    const body = src.slice(open + 1, j - 1);
    if (/^@(media|supports)/.test(head)) out += `${head}{${scopeThemeCss(body, scope)}}`;
    else if (/^@keyframes/.test(head)) out += `${head}{${body}}`;
    else out += head.split(",").map((s) => `${scope} ${s.trim()}`).join(", ") + `{${body}}`;
    i = j;
  }
  return out;
}
