// Catalogo: due modelli principali, tre stili ciascuno, add-on con prezzo fisso.
export type ModelId = "save-the-date" | "invitation-rsvp";
export type EventType = "wedding" | "birthday" | "baby" | "corporate" | "graduation";

export const MODELS: {
  id: ModelId;
  name: string;
  tagline: string;
  description: string;
  hasRsvp: boolean;
  priceCents: number;
}[] = [
  {
    id: "save-the-date",
    name: "Save the Date",
    tagline: "Annuncia la data con una sola immagine",
    description: "Una scheda elegante con foto, nomi, data e conto alla rovescia. Il dettaglio completo arriva dopo.",
    hasRsvp: false,
    priceCents: 3900,
  },
  {
    id: "invitation-rsvp",
    name: "Invito con conferma presenza",
    tagline: "Tutti i dettagli e le risposte in un solo link",
    description: "Invito completo con programma, mappa, musica e un modulo di conferma presenza per ogni ospite.",
    hasRsvp: true,
    priceCents: 6500,
  },
];

export const STYLES: {
  id: string;
  name: string;
  bg: string;
  ink: string;
  accent: string;
  font: "serif" | "sans";
}[] = [
  { id: "avorio", name: "Avorio", bg: "#f7f3ec", ink: "#1d1b18", accent: "#0a4560", font: "serif" },
  { id: "laguna", name: "Laguna", bg: "#0a4560", ink: "#f4fbfc", accent: "#8fdbe6", font: "serif" },
  { id: "corallo", name: "Corallo", bg: "#fdeee8", ink: "#3a2622", accent: "#d9573f", font: "sans" },
];

export const EVENT_TYPES: { id: EventType; label: string; sampleTitle: string }[] = [
  { id: "wedding", label: "Matrimonio", sampleTitle: "Sara & Luca" },
  { id: "birthday", label: "Compleanno", sampleTitle: "I 40 di Marco" },
  { id: "baby", label: "Baby shower", sampleTitle: "Aspettiamo Bea" },
  { id: "corporate", label: "Evento aziendale", sampleTitle: "Cena di Gala 2027" },
  { id: "graduation", label: "Laurea", sampleTitle: "Laurea di Giulia" },
];

export const PRICING = {
  currency: "EUR",
  addons: {
    music: { label: "Musica per la serata", cents: 1500 },
    map: { label: "Mappa e indicazioni", cents: 1000 },
    countdown: { label: "Conto alla rovescia", cents: 500 },
    express: { label: "Consegna express 24–48 h", cents: 2500 },
  },
} as const;

export type AddonKey = keyof typeof PRICING.addons;

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id);
}

export function getStyle(id: string) {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

export function formatPrice(cents: number, locale = "it-IT", currency = PRICING.currency) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
