export type Category = "wedding" | "birthday" | "baby" | "corporate" | "graduation";

export type Template = {
  id: string;
  name: string;
  category: Category;
  tagline: string;
  palette: { bg: string; ink: string; accent: string; soft: string };
  font: "serif" | "script" | "sans";
  badge?: "New" | "Popular";
};

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "wedding", label: "Matrimoni", blurb: "Fidanzamenti e anniversari inclusi" },
  { id: "birthday", label: "Compleanni & baby shower", blurb: "Feste private con mood giocoso" },
  { id: "corporate", label: "Eventi aziendali", blurb: "Lanci, cene e premiazioni" },
  { id: "graduation", label: "Lauree", blurb: "Celebrazioni di traguardi" },
];

export const TEMPLATES: Template[] = [
  { id: "aurora-vows", name: "Aurora Vows", category: "wedding", tagline: "Un'alba color champagne per il vostro sì", palette: { bg: "#1c1420", ink: "#f7ead8", accent: "#e8b86d", soft: "#3a2a3a" }, font: "serif", badge: "Popular" },
  { id: "garden-oud", name: "Garden Oud", category: "wedding", tagline: "Petali, legno scuro e un profumo d'oriente", palette: { bg: "#14201a", ink: "#eef3e6", accent: "#c9d98b", soft: "#22332a" }, font: "script", badge: "New" },
  { id: "dolce-tulle", name: "Dolce Tulle", category: "wedding", tagline: "Tulle, nastro e una sera lunga come un film", palette: { bg: "#f6ebe4", ink: "#3b2430", accent: "#c26a7a", soft: "#ecd5cd" }, font: "serif" },
  { id: "festa-pop", name: "Festa Pop", category: "birthday", tagline: "Coriandoli e numeri giganti per il vostro giorno", palette: { bg: "#ff7a59", ink: "#fff7f0", accent: "#ffe066", soft: "#ff9a7d" }, font: "sans", badge: "Popular" },
  { id: "bebe-luna", name: "Bebè Luna", category: "birthday", tagline: "Stelle morbide e una culla di parole dolci", palette: { bg: "#e9eefc", ink: "#243056", accent: "#8aa6ff", soft: "#d4defa" }, font: "script" },
  { id: "boardroom-gold", name: "Boardroom Gold", category: "corporate", tagline: "Sobrio, nitido, da invito di gala", palette: { bg: "#0d1116", ink: "#e9edf3", accent: "#d4af37", soft: "#1a2029" }, font: "sans", badge: "New" },
  { id: "laurea-laurel", name: "Laurea Laurel", category: "graduation", tagline: "Alloro, tocco e un traguardo da festeggiare", palette: { bg: "#0f2a24", ink: "#f2f6ef", accent: "#f0c674", soft: "#183d34" }, font: "serif" },
];

export const PRICING = {
  currency: "EUR",
  basePriceCents: 6500,
  addons: {
    music: { label: "Musica di sottofondo", cents: 1500 },
    map: { label: "Mappa interattiva", cents: 1000 },
    extraSection: { label: "Sezione extra", cents: 500 },
    countdown: { label: "Conto alla rovescia", cents: 500 },
    express: { label: "Consegna express 24–48 h", cents: 2500 },
  },
} as const;

export type AddonKey = keyof typeof PRICING.addons;

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function formatPrice(cents: number, locale = "it-IT", currency = PRICING.currency) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
