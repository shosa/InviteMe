import type { AddonKey } from "./catalog";

export type RsvpQuestion = { id: string; label: string; type: "yes-no" | "text" | "number" };

export type InviteConfig = {
  templateId: string;
  title: string;
  hosts: string;
  eventDate: string; // ISO yyyy-mm-dd
  eventTime: string;
  venue: string;
  address: string;
  message: string;
  photos: string[]; // data URLs or https links
  colors: { bg: string; ink: string; accent: string };
  font: "serif" | "script" | "sans";
  sections: { id: string; title: string; body: string }[];
  rsvpQuestions: RsvpQuestion[];
  addons: AddonKey[];
  musicUrl?: string;
  locale: "it" | "en";
};

export type Invitation = {
  id: string;
  slug: string;
  createdAt: string;
  config: InviteConfig;
  status: "draft" | "paid";
  orderRef?: string;
  views: number;
};

export const DEFAULT_RSVP: RsvpQuestion[] = [
  { id: "attending", label: "Ci sarai?", type: "yes-no" },
  { id: "guests", label: "Quante persone siete?", type: "number" },
  { id: "note", label: "Un messaggio per noi", type: "text" },
];

export function defaultConfig(templateId: string, category: string): InviteConfig {
  const isWedding = category === "wedding";
  return {
    templateId,
    title: isWedding ? "Sara & Luca" : "La tua festa",
    hosts: isWedding ? "Sara e Luca" : "Famiglia Rossi",
    eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10),
    eventTime: "19:30",
    venue: "Villa dei Glicini",
    address: "Via dei Giardini 12, Firenze",
    message: "Siamo felici di condividere con te un giorno speciale.",
    photos: [],
    colors: { bg: "#1c1420", ink: "#f7ead8", accent: "#e8b86d" },
    font: "serif",
    sections: [{ id: "s1", title: "Il programma", body: "Aperitivo, cena, musica fino a notte." }],
    rsvpQuestions: DEFAULT_RSVP,
    addons: [],
    locale: "it",
  };
}

export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "invito"}-${Math.random().toString(36).slice(2, 7)}`;
}
