import { EVENT_TYPES, MODELS, PRICING, STYLES, type AddonKey, type EventType, type ModelId } from "./catalog";

export type RsvpQuestion = { id: string; label: string; type: "yes-no" | "text" | "number" };

export type InviteConfig = {
  model: ModelId;
  styleId: string;
  eventType: EventType;
  title: string; // es. "Sara & Luca"
  hosts: string;
  eventDate: string; // yyyy-mm-dd
  eventTime: string; // HH:mm
  venue: string;
  address: string;
  message: string;
  photos: string[]; // data URL JPEG compressi, max 3
  sections: { id: string; title: string; body: string }[];
  rsvpQuestions: RsvpQuestion[];
  addons: AddonKey[];
  musicUrl?: string; // solo https
  locale: "it" | "en";
};

export type Guest = { email: string; name?: string; sentAt: string };

export type Invitation = {
  id: string;
  slug: string;
  userId: string;
  createdAt: string;
  config: InviteConfig;
  status: "draft" | "paid";
  orderRef?: string;
  views: number;
  guests: Guest[];
};

export const DEFAULT_RSVP: RsvpQuestion[] = [
  { id: "attending", label: "Parteciperai?", type: "yes-no" },
  { id: "guests", label: "Numero di persone (compreso lei/lui)", type: "number" },
  { id: "diet", label: "Esigenze alimentari", type: "text" },
  { id: "note", label: "Un messaggio per gli sposi", type: "text" },
];

export function defaultConfig(model: ModelId, eventType: EventType = "wedding"): InviteConfig {
  const type = EVENT_TYPES.find((e) => e.id === eventType) ?? EVENT_TYPES[0];
  const style = STYLES[0];
  return {
    model,
    styleId: style.id,
    eventType,
    title: type.sampleTitle,
    hosts: eventType === "wedding" ? "Sara e Luca" : "La famiglia",
    eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10),
    eventTime: "19:30",
    venue: "Villa dei Glicini",
    address: "Via dei Giardini 12, Firenze",
    message: "Abbiamo il piacere di invitarvi a festeggiare con noi.",
    photos: [],
    sections: [{ id: "s1", title: "Programma", body: "Aperitivo in giardino, cena e musica fino a notte." }],
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

const HEX = /^#[0-9a-fA-F]{6}$/;
const str = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.slice(0, max) : fallback);

// Valida e normalizza la configurazione ricevuta dal client: nessun campo è fidato.
export function sanitizeConfig(input: unknown): InviteConfig | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  const model: ModelId = MODELS.some((m) => m.id === c.model) ? (c.model as ModelId) : "invitation-rsvp";
  const base = defaultConfig(model);
  const eventType = EVENT_TYPES.some((e) => e.id === c.eventType) ? (c.eventType as EventType) : base.eventType;
  const styleId = STYLES.some((s) => s.id === c.styleId) ? str(c.styleId, 20) : base.styleId;
  const addons = Array.isArray(c.addons)
    ? (c.addons.filter((a): a is AddonKey => typeof a === "string" && a in PRICING.addons) as AddonKey[])
    : [];
  const musicUrl = str(c.musicUrl, 500);
  const hasRsvp = MODELS.find((m) => m.id === model)?.hasRsvp ?? false;

  return {
    model,
    styleId,
    eventType,
    title: str(c.title, 80, base.title),
    hosts: str(c.hosts, 80, base.hosts),
    eventDate: /^\d{4}-\d{2}-\d{2}$/.test(str(c.eventDate, 10)) ? str(c.eventDate, 10) : base.eventDate,
    eventTime: /^\d{2}:\d{2}$/.test(str(c.eventTime, 5)) ? str(c.eventTime, 5) : base.eventTime,
    venue: str(c.venue, 120, base.venue),
    address: str(c.address, 200, base.address),
    message: str(c.message, 500, base.message),
    photos: Array.isArray(c.photos)
      ? c.photos.filter((p): p is string => typeof p === "string" && p.startsWith("data:image/")).slice(0, 3)
      : [],
    sections: hasRsvp && Array.isArray(c.sections)
      ? c.sections.slice(0, 5).map((s, i) => {
          const x = (s ?? {}) as Record<string, unknown>;
          return { id: str(x.id, 40, `s${i}`), title: str(x.title, 80), body: str(x.body, 600) };
        })
      : base.sections,
    rsvpQuestions: hasRsvp && Array.isArray(c.rsvpQuestions)
      ? c.rsvpQuestions.slice(0, 6).map((q, i) => {
          const x = (q ?? {}) as Record<string, unknown>;
          const type = x.type === "number" || x.type === "text" || x.type === "yes-no" ? x.type : "text";
          return { id: str(x.id, 40, `q${i}`), label: str(x.label, 160, "Domanda"), type };
        })
      : base.rsvpQuestions,
    addons,
    musicUrl: musicUrl.startsWith("https://") ? musicUrl : undefined,
    locale: c.locale === "en" ? "en" : "it",
  };
}
