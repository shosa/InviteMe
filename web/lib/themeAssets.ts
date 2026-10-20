import type { ThemeManifest } from "@inviteme/shared";

// Immagini che il template usa già (fiori, ornamenti, foto d'esempio): le riusa la gestione dell'invito.
// Si ricavano dai dati demo del manifest, così restano quelle del template e non ne servono altre.
export type ThemeDecor = { floral?: string; ornament?: string; photos: string[] };

export function themeDecor(m: ThemeManifest): ThemeDecor {
  const base = `/api/themes/${m.id}/`;
  const names = [...new Set(JSON.stringify(m.demo).match(/assets\/[\w.-]+\.(?:jpg|png|svg)/g) ?? [])];
  const url = (n: string) => `${base}${n}`;
  const floral = names.find((n) => /floral.*\.png$/.test(n));
  const ornament = names.find((n) => /ornament\.svg$/.test(n));
  const photos = names.filter((n) => /\.jpg$/.test(n) && !/placeholder/.test(n)).map(url);
  return { floral: floral && url(floral), ornament: ornament && url(ornament), photos };
}
