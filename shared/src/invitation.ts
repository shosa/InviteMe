import { EVENT_TYPES, activeFeatures, enabledModels, enabledStyles, getModel, getStyle, maxPhotos, type AddonKey, type Catalog, type EventType } from "./catalog";

export type RsvpQuestion = { id: string; label: string; type: "yes-no" | "text" | "number" | "choice"; options?: string[] };

export type InviteConfig = {
  model: string;
  styleId: string;
  eventType: EventType;
  title: string;
  hosts: string;
  eventDate: string; // yyyy-mm-dd
  eventTime: string; // HH:mm
  venue: string;
  address: string;
  message: string;
  photos: string[]; // data URL JPEG compressi
  sections: { id: string; title: string; body: string }[];
  rsvpQuestions: RsvpQuestion[];
  addons: AddonKey[]; // solo funzioni acquistabili per il modello
  musicTrackId?: string; // brano dalla libreria dell'admin
  musicUrl?: string; // oppure un link https proprio
  locale: "it" | "en";
};

export const DEFAULT_RSVP: RsvpQuestion[] = [
  { id: "attending", label: "Parteciperai?", type: "yes-no" },
  { id: "guests", label: "Numero di persone (compreso lei/lui)", type: "number" },
  { id: "diet", label: "Esigenze alimentari", type: "text" },
  { id: "note", label: "Un messaggio per gli sposi", type: "text" },
];

export function defaultConfig(c: Catalog, model: string, eventType: EventType = "wedding"): InviteConfig {
  const type = EVENT_TYPES.find((e) => e.id === eventType) ?? EVENT_TYPES[0];
  return {
    model,
    styleId: enabledStyles(c)[0]?.id ?? "avorio",
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

const str = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.slice(0, max) : fallback);

// Valida e normalizza la configurazione ricevuta dal client: nessun campo è fidato.
export function sanitizeConfig(c: Catalog, input: unknown): InviteConfig | null {
  if (!input || typeof input !== "object") return null;
  const x = input as Record<string, unknown>;
  const models = enabledModels(c);
  if (models.length === 0) return null;
  const model = getModel(c, String(x.model)) ? String(x.model) : models[0].id;
  const base = defaultConfig(c, model);
  const eventType = EVENT_TYPES.some((e) => e.id === x.eventType) ? (x.eventType as EventType) : base.eventType;
  const styleId = getStyle(c, String(x.styleId)).id;

  const options = getModel(c, model)?.options ?? [];
  const selected = Array.isArray(x.addons)
    ? [...new Set(x.addons.filter((a): a is AddonKey => typeof a === "string" && options.includes(a as AddonKey)))]
    : [];
  const features = activeFeatures(c, model, selected);
  const track = c.music.find((t) => t.id === x.musicTrackId && t.enabled);
  const musicUrl = str(x.musicUrl, 500);
  const rsvpChoice = x.rsvpQuestions;

  return {
    model,
    styleId,
    eventType,
    title: str(x.title, 80, base.title),
    hosts: str(x.hosts, 80, base.hosts),
    eventDate: /^\d{4}-\d{2}-\d{2}$/.test(str(x.eventDate, 10)) ? str(x.eventDate, 10) : base.eventDate,
    eventTime: /^\d{2}:\d{2}$/.test(str(x.eventTime, 5)) ? str(x.eventTime, 5) : base.eventTime,
    venue: str(x.venue, 120, base.venue),
    address: str(x.address, 200, base.address),
    message: str(x.message, 500, base.message),
    photos: Array.isArray(x.photos)
      ? x.photos.filter((p): p is string => typeof p === "string" && p.startsWith("data:image/")).slice(0, maxPhotos(c, model, selected))
      : [],
    sections: Array.isArray(x.sections)
      ? x.sections.slice(0, 5).map((s, i) => {
          const y = (s ?? {}) as Record<string, unknown>;
          return { id: str(y.id, 40, `s${i}`), title: str(y.title, 80), body: str(y.body, 600) };
        })
      : base.sections,
    rsvpQuestions: features.has("rsvp") && Array.isArray(rsvpChoice)
      ? rsvpChoice.slice(0, 8).map((q, i) => {
          const y = (q ?? {}) as Record<string, unknown>;
          const type = y.type === "number" || y.type === "text" || y.type === "yes-no" || y.type === "choice" ? y.type : "text";
          const options = Array.isArray(y.options) ? y.options.filter((o): o is string => typeof o === "string").map((o) => o.slice(0, 60)).slice(0, 6) : undefined;
          return { id: str(y.id, 40, `q${i}`), label: str(y.label, 160, "Domanda"), type, options };
        })
      : base.rsvpQuestions,
    addons: selected,
    musicTrackId: track ? track.id : undefined,
    musicUrl: !track && musicUrl.startsWith("https://") ? musicUrl : undefined,
    locale: x.locale === "en" ? "en" : "it",
  };
}

export function hasRsvp(c: Catalog, config: Pick<InviteConfig, "model" | "addons">): boolean {
  return activeFeatures(c, config.model, config.addons).has("rsvp");
}
