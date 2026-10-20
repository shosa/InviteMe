// Catalogo condiviso tra API e frontend. I valori qui sono i DEFAULT: in produzione il catalogo effettivo
// è letto dal database e modificabile dalla console admin (vedi api/src/catalog.ts).
import type { AddonKey } from "./addons";
import type { ThemeManifest } from "./engine/manifest";

export type { AddonKey } from "./addons";
export type ModelId = string;
export type EventType = "wedding" | "birthday" | "baby" | "corporate" | "graduation";

export type ModelDef = {
  id: ModelId;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  included: AddonKey[]; // incluse nel prezzo base
  options: AddonKey[]; // acquistabili a parte
  enabled: boolean;
  sort: number;
};

export type AddonDef = { key: AddonKey; label: string; description: string; cents: number; enabled: boolean };

// Un tema è una cartella in themes/ (vedi docs/TEMI.md). Il catalogo salva solo se è attivo.
export type ThemeEntry = { enabled: boolean; manifest: ThemeManifest };

export type MusicTrack = { id: string; title: string; artist: string; url: string; enabled: boolean; license: string };

export type Catalog = { models: ModelDef[]; addons: AddonDef[]; themes: ThemeEntry[]; music: MusicTrack[] };

export const DEFAULT_CATALOG: Omit<Catalog, "themes" | "music"> = {
  models: [
    {
      id: "save-the-date",
      name: "Save the Date",
      tagline: "Annuncia la data con una sola immagine",
      description: "Una scheda elegante con foto, nomi e data. Il dettaglio completo arriva dopo.",
      priceCents: 3900,
      included: [],
      options: ["countdown", "music", "gallery", "express"],
      enabled: true,
      sort: 1,
    },
    {
      id: "invitation-rsvp",
      name: "Invito con conferma presenza",
      tagline: "Tutti i dettagli e le risposte in un solo link",
      description: "Invito completo con programma e modulo di conferma. Mappa, musica e altre funzioni si aggiungono a parte.",
      priceCents: 6500,
      included: ["rsvp", "program"],
      options: ["map", "music", "countdown", "gallery", "express"],
      enabled: true,
      sort: 2,
    },
    {
      id: "custom",
      name: "Su misura",
      tagline: "Costruisci l'invito funzione per funzione",
      description: "Parti dalla base e aggiungi solo ciò che ti serve. Ogni funzione ha un prezzo fisso, visibile prima del pagamento.",
      priceCents: 2900,
      included: [],
      options: ["rsvp", "program", "map", "music", "countdown", "gallery", "express"],
      enabled: false,
      sort: 3,
    },
  ],
  addons: [
    { key: "rsvp", label: "Conferma di presenza", description: "Modulo di risposta con domande personalizzate", cents: 1500, enabled: true },
    { key: "program", label: "Programma dettagliato", description: "Fino a 5 voci: cerimonia, cena, festa", cents: 500, enabled: true },
    { key: "map", label: "Mappa e indicazioni", description: "Mappa del luogo con link alle indicazioni", cents: 1000, enabled: true },
    { key: "music", label: "Musica di sottofondo", description: "Un brano dalla libreria, o il tuo file", cents: 1500, enabled: true },
    { key: "countdown", label: "Conto alla rovescia", description: "Giorni, ore, minuti e secondi alla data", cents: 500, enabled: true },
    { key: "gallery", label: "Galleria foto", description: "Fino a 6 foto invece di 3", cents: 1000, enabled: true },
    { key: "express", label: "Consegna express 24–48 h", description: "Priorità nella messa online", cents: 2500, enabled: true },
  ],
};

export const EVENT_TYPES: { id: EventType; label: string; sampleTitle: string }[] = [
  { id: "wedding", label: "Matrimonio", sampleTitle: "Sara & Luca" },
  { id: "birthday", label: "Compleanno", sampleTitle: "I 40 di Marco" },
  { id: "baby", label: "Baby shower", sampleTitle: "Aspettiamo Bea" },
  { id: "corporate", label: "Evento aziendale", sampleTitle: "Cena di Gala 2027" },
  { id: "graduation", label: "Laurea", sampleTitle: "Laurea di Giulia" },
];

export const CURRENCY = "EUR";

export function enabledModels(c: Catalog) {
  return c.models.filter((m) => m.enabled).sort((a, b) => a.sort - b.sort);
}

// Temi attivi che offrono il modello (un tema senza elenco di modelli li offre tutti).
export function enabledThemes(c: Catalog, model?: string): ThemeManifest[] {
  return c.themes
    .filter((t) => t.enabled && (!model || t.manifest.models.length === 0 || t.manifest.models.includes(model)))
    .map((t) => t.manifest);
}

export function getModel(c: Catalog, id: string) {
  return c.models.find((m) => m.id === id && m.enabled);
}
export function getTheme(c: Catalog, id: string, model?: string): ThemeManifest | undefined {
  return enabledThemes(c, model).find((t) => t.id === id);
}
export function getAddon(c: Catalog, key: string) {
  return c.addons.find((a) => a.key === key && a.enabled);
}

// Funzioni attive: quelle incluse nel modello più quelle scelte, solo se acquistabili e abilitate.
export function activeFeatures(c: Catalog, model: string, selected: string[]): Set<AddonKey> {
  const m = getModel(c, model);
  const set = new Set<AddonKey>(m?.included ?? []);
  for (const a of selected) if (m?.options.includes(a as AddonKey) && getAddon(c, a)) set.add(a as AddonKey);
  return set;
}

export function formatPrice(cents: number, locale = "it-IT", currency = CURRENCY) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
