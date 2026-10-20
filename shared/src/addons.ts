// Funzioni acquistabili di un invito. Stanno qui (e non nel catalogo) perché sono usate sia dal catalogo
// sia dalla validazione dei temi: un tema dichiara quali funzioni usa, un campo può dipendere da una funzione.
export const ADDON_KEYS = ["rsvp", "program", "map", "music", "countdown", "gallery"] as const;
export type AddonKey = (typeof ADDON_KEYS)[number];

export const isAddonKey = (v: unknown): v is AddonKey => typeof v === "string" && (ADDON_KEYS as readonly string[]).includes(v);
