import { DEFAULT_CATALOG, type AddonDef, type Catalog, type ModelDef, type MusicTrack, type StyleDef } from "@inviteme/shared";
import { pool } from "./db";

// Il catalogo effettivo = default del codice + modifiche salvate dalla console admin (tabella settings).
// Le modifiche sono salvate per intero: la chiave 'catalog' contiene solo models, addons e styles.
type Stored = Pick<Catalog, "models" | "addons" | "styles">;

export async function loadCatalog(opts: { includeDisabled?: boolean } = {}): Promise<Catalog> {
  const [{ rows: s }, { rows: t }] = await Promise.all([
    pool.query("SELECT value FROM settings WHERE key = 'catalog'"),
    pool.query("SELECT id, title, artist, url, license, enabled FROM music_tracks ORDER BY created_at DESC"),
  ]);
  const stored = s[0]?.value as Partial<Stored> | undefined;
  const models: ModelDef[] = stored?.models ?? DEFAULT_CATALOG.models;
  const addons: AddonDef[] = stored?.addons ?? DEFAULT_CATALOG.addons;
  const styles: StyleDef[] = stored?.styles ?? DEFAULT_CATALOG.styles;
  const music: MusicTrack[] = t.map((r) => ({ id: r.id, title: r.title, artist: r.artist, url: r.url, license: r.license, enabled: r.enabled }));

  const filter = <T extends { enabled: boolean }>(list: T[]) => (opts.includeDisabled ? list : list.filter((x) => x.enabled));
  return { models: filter(models), addons: filter(addons), styles: filter(styles), music: filter(music) };
}

// Salva il catalogo completo (solo i campi gestiti dalla console). Ritorna il catalogo aggiornato.
export async function saveCatalog(next: Stored): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('catalog', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(next)],
  );
}

// Versione completa, per la console: include anche gli elementi disabilitati.
export async function loadFullCatalog(): Promise<Catalog> {
  return loadCatalog({ includeDisabled: true });
}
