import { BUILTIN_THEMES, DEFAULT_CATALOG, THEME_SCHEMA, validateTheme, type AddonDef, type Catalog, type ModelDef, type MusicTrack, type StyleDef } from "@inviteme/shared";
import { pool } from "./db";

// Il catalogo effettivo = default del codice + modifiche salvate dalla console admin (tabella settings).
// La chiave 'catalog' contiene models, addons e styles (i temi). I temi preimpostati vengono sempre dal codice,
// quelli caricati dall'admin vengono ricostruiti e validati ad ogni lettura.
type Stored = Pick<Catalog, "models" | "addons" | "styles">;

const BUILTIN_IDS = new Set(BUILTIN_THEMES.map((t) => t.id));

// Unisce i temi preimpostati (con lo stato attivo salvato) e i temi caricati dall'admin.
export function mergeThemes(stored: StyleDef[] | undefined): StyleDef[] {
  const saved = stored ?? [];
  const builtin = BUILTIN_THEMES.map((b) => {
    const s = saved.find((x) => x.id === b.id);
    return s ? { ...b, enabled: s.enabled !== false } : b;
  });
  const uploaded: StyleDef[] = [];
  for (const s of saved) {
    if (BUILTIN_IDS.has(s.id)) continue;
    // Il tema salvato è nella forma normalizzata: lo riporto al formato del manifest prima di validarlo.
    const manifest = { schema: THEME_SCHEMA, id: s.id, name: s.name, description: s.description, models: s.models, palette: s.palette, typography: s.typography, shape: s.shape, layout: s.layout, motion: s.motion, css: s.css, font: s.font, music: s.music };
    const r = validateTheme(manifest);
    if (r.theme) uploaded.push({ ...r.theme, enabled: s.enabled !== false, builtin: false });
  }
  return [...builtin, ...uploaded];
}

// Cache in memoria del catalogo completo: i temi con font e audio incorporati non si rileggono a ogni richiesta.
// Si invalida a ogni salvataggio e dopo 15 secondi al massimo (per le modifiche alla libreria musicale).
const TTL_MS = 15_000;
let cache: { at: number; full: Catalog } | null = null;

export function invalidateCatalog() {
  cache = null;
}

async function readFull(): Promise<Catalog> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.full;
  const [{ rows: s }, { rows: t }] = await Promise.all([
    pool.query("SELECT value FROM settings WHERE key = 'catalog'"),
    pool.query("SELECT id, title, artist, url, license, enabled FROM music_tracks ORDER BY created_at DESC"),
  ]);
  const stored = s[0]?.value as Partial<Stored> | undefined;
  const full: Catalog = {
    models: stored?.models ?? DEFAULT_CATALOG.models,
    addons: stored?.addons ?? DEFAULT_CATALOG.addons,
    styles: mergeThemes(stored?.styles),
    music: t.map((r) => ({ id: r.id, title: r.title, artist: r.artist, url: r.url, license: r.license, enabled: r.enabled })),
  };
  cache = { at: Date.now(), full };
  return full;
}

export async function loadCatalog(opts: { includeDisabled?: boolean } = {}): Promise<Catalog> {
  const full = await readFull();
  if (opts.includeDisabled) return full;
  const on = <T extends { enabled: boolean }>(list: T[]) => list.filter((x) => x.enabled);
  return { models: on(full.models), addons: on(full.addons), styles: on(full.styles), music: on(full.music) };
}

// Salva il catalogo completo (solo i campi gestiti dalla console).
export async function saveCatalog(next: Stored): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('catalog', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(next)],
  );
  invalidateCatalog();
}

// Versione completa, per la console: include anche gli elementi disabilitati.
export async function loadFullCatalog(): Promise<Catalog> {
  return loadCatalog({ includeDisabled: true });
}

export { BUILTIN_IDS };
