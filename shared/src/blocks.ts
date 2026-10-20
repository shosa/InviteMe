import type { AddonKey } from "./addons";
import type { FieldDef } from "./engine/manifest";

// Un invito è una lista ordinata di blocchi. Ogni blocco ha un tipo (il suo aspetto lo decide il template del blocco),
// proprietà proprie e può essere nascosto. I dati dell'evento (titolo, data, luogo…) sono globali e condivisi.

export const BLOCK_TYPES = [
  "cover",
  "hero",
  "scratchdate",
  "countdown",
  "message",
  "gallery",
  "program",
  "venue",
  "map",
  "transfer",
  "dresscode",
  "video",
  "music",
  "rsvp",
  "footer",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockDef = {
  type: BlockType;
  label: string;
  description: string;
  feature?: AddonKey; // il blocco si può aggiungere solo se l'invito ha la funzione
  unique?: boolean; // al massimo uno per invito
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  defaultsEn?: Record<string, unknown>; // testi di partenza in inglese (invito in lingua inglese)
};

// Dati dell'evento: validi per tutto l'invito, modificati nel pannello «Evento».
export const EVENT_FIELDS: FieldDef[] = [
  { key: "title", label: "Nomi o titolo", type: "text", group: "Evento", required: true, max: 80 },
  { key: "hosts", label: "Riga sotto i nomi", type: "text", group: "Evento", max: 120 },
  { key: "eventDate", label: "Data", type: "date", group: "Evento", required: true },
  { key: "eventTime", label: "Ora di inizio", type: "time", group: "Evento", required: true },
  { key: "venue", label: "Luogo", type: "text", group: "Evento", max: 120 },
  { key: "address", label: "Indirizzo", type: "text", group: "Evento", max: 200 },
];

export const EVENT_DEFAULTS: Record<string, string> = {
  title: "Luca e Sara",
  hosts: "Con gioia, le famiglie",
  eventDate: "",
  eventTime: "16:00",
  venue: "",
  address: "",
};

const PROGRAM_ITEM: FieldDef[] = [
  { key: "time", label: "Orario", type: "text", group: "Voce", max: 10 },
  { key: "label", label: "Che cosa", type: "text", group: "Voce", max: 80 },
];

export const BLOCKS: BlockDef[] = [
  {
    type: "cover",
    label: "Busta",
    description: "Copertina che si apre al tocco, con filmato e suono facoltativi.",
    unique: true,
    fields: [
      { key: "coverVideo", label: "Filmato della busta (muto, max 90 s)", type: "video", group: "Busta" },
      { key: "coverSound", label: "Suono all'apertura", type: "audio", group: "Busta" },
    ],
    defaults: { coverVideo: "", coverSound: "" },
    defaultsEn: {},
  },
  {
    type: "hero",
    label: "Intestazione",
    description: "Nomi, sottotitolo e foto principale.",
    unique: true,
    fields: [
      { key: "occasion", label: "Sottotitolo", type: "text", group: "Intestazione", max: 60 },
      { key: "couplePhoto", label: "Foto principale", type: "photo", group: "Intestazione" },
    ],
    defaults: { occasion: "Per sempre", couplePhoto: "" },
    defaultsEn: { occasion: "Forever" },
  },
  {
    type: "scratchdate",
    label: "Data da grattare",
    description: "Giorno, mese e anno da scoprire con il dito.",
    unique: true,
    fields: [],
    defaults: {},
  },
  {
    type: "countdown",
    label: "Conto alla rovescia",
    description: "Giorni, ore, minuti e secondi alla data.",
    feature: "countdown",
    unique: true,
    fields: [],
    defaults: {},
  },
  {
    type: "message",
    label: "Messaggio",
    description: "Un testo libero con titolo.",
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Testo", max: 80 },
      { key: "body", label: "Testo", type: "longtext", group: "Testo", max: 1200 },
    ],
    defaults: { heading: "Invito", body: "Abbiamo il piacere di invitarvi a festeggiare con noi." },
    defaultsEn: { heading: "Invitation", body: "We would love to celebrate with you." },
  },
  {
    type: "gallery",
    label: "Galleria",
    description: "Fino a sei foto in griglia.",
    feature: "gallery",
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Galleria", max: 80 },
      { key: "photos", label: "Foto", type: "photos", group: "Galleria", max: 6 },
    ],
    defaults: { heading: "Noi due", photos: [] },
    defaultsEn: { heading: "Our story" },
  },
  {
    type: "program",
    label: "Programma",
    description: "Orari della giornata su una timeline.",
    feature: "program",
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Programma", max: 80 },
      { key: "items", label: "Voci", type: "list", group: "Programma", max: 8, item: PROGRAM_ITEM },
    ],
    defaults: {
      heading: "Programma",
      items: [
        { time: "16:00", label: "Cerimonia" },
        { time: "18:00", label: "Aperitivo" },
        { time: "20:00", label: "Cena" },
      ],
    },
    defaultsEn: { heading: "Programme", items: [{ time: "16:00", label: "Ceremony" }, { time: "18:00", label: "Aperitif" }, { time: "20:00", label: "Dinner" }] },
  },
  {
    type: "venue",
    label: "Luogo",
    description: "Nome, indirizzo e foto del luogo.",
    unique: true,
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Luogo", max: 80 },
      { key: "photo", label: "Foto del luogo", type: "photo", group: "Luogo" },
    ],
    defaults: { heading: "Dove", photo: "" },
    defaultsEn: { heading: "Where" },
  },
  {
    type: "map",
    label: "Mappa",
    description: "Mappa del luogo con il link alle indicazioni.",
    feature: "map",
    unique: true,
    fields: [],
    defaults: {},
  },
  {
    type: "transfer",
    label: "Come arrivare",
    description: "Navetta, parcheggio, indicazioni.",
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Come arrivare", max: 80 },
      { key: "body", label: "Indicazioni", type: "longtext", group: "Come arrivare", max: 800 },
    ],
    defaults: { heading: "Come arrivare", body: "" },
    defaultsEn: { heading: "How to get there", body: "" },
  },
  {
    type: "dresscode",
    label: "Dress code",
    description: "Un abbigliamento richiesto, in evidenza.",
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Dress code", max: 80 },
      { key: "dress", label: "Dress code", type: "text", group: "Dress code", max: 60 },
    ],
    defaults: { heading: "Dress code", dress: "Black tie" },
    defaultsEn: { heading: "Dress code", dress: "Black tie" },
  },
  {
    type: "video",
    label: "Video",
    description: "Un video muto in loop, che parte quando entra nello schermo.",
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Video", max: 80 },
      { key: "video", label: "Video (muto, max 90 s)", type: "video", group: "Video" },
    ],
    defaults: { heading: "Un assaggio", video: "" },
    defaultsEn: { heading: "A taste of the day" },
  },
  {
    type: "music",
    label: "Musica",
    description: "Musica di sottofondo: parte quando la busta si apre, con un pulsante per fermarla.",
    feature: "music",
    unique: true,
    fields: [{ key: "music", label: "Brano (mp3, max 6 MB)", type: "audio", group: "Musica" }],
    defaults: { music: "" },
    defaultsEn: { music: "" },
  },
  {
    type: "rsvp",
    label: "Conferma di presenza",
    description: "Modulo di risposta in popup, con le domande configurate.",
    feature: "rsvp",
    unique: true,
    fields: [
      { key: "heading", label: "Titolo", type: "text", group: "Conferma", max: 80 },
      { key: "intro", label: "Testo introduttivo", type: "longtext", group: "Conferma", max: 300 },
    ],
    defaults: { heading: "Conferma la tua presenza", intro: "Ti chiediamo gentilmente di confermare la tua presenza." },
    defaultsEn: { heading: "Confirm your attendance", intro: "Please let us know whether you will be able to join us." },
  },
  {
    type: "footer",
    label: "Firma",
    description: "Firma in fondo alla pagina.",
    unique: true,
    fields: [{ key: "signature", label: "Firma", type: "text", group: "Firma", max: 80 }],
    defaults: { signature: "Luca e Sara" },
    defaultsEn: { signature: "With love" },
  },
];

export type BlockInstance = {
  id: string;
  type: BlockType;
  hidden?: boolean;
  props: Record<string, unknown>;
};

export const blockDef = (type: string): BlockDef | undefined => BLOCKS.find((b) => b.type === type);

// Blocchi di partenza per un nuovo invito. L'ordine è quello della pagina.
// Aspetto: ogni blocco può cambiare sfondo e colore del testo. La data da grattare aggiunge forma e colore della copertura.
// Un valore vuoto vale il colore del tema, quindi un invito senza modifiche resta identico a prima.
const LOOK_FIELDS: FieldDef[] = [
  { key: "lookBg", label: "Colore di sfondo", type: "color", group: "Aspetto" },
  { key: "lookInk", label: "Colore del testo", type: "color", group: "Aspetto" },
];
const SCRATCH_LOOK: FieldDef[] = [
  {
    key: "lookShape",
    label: "Forma delle caselle",
    type: "choice",
    group: "Aspetto",
    options: [
      { value: "square", label: "Squadrata" },
      { value: "round", label: "Ovale" },
      { value: "pill", label: "Pillola" },
    ],
  },
  { key: "lookCover", label: "Colore della copertura", type: "color", group: "Aspetto" },
];
for (const b of BLOCKS) b.fields = [...b.fields, ...LOOK_FIELDS, ...(b.type === "scratchdate" ? SCRATCH_LOOK : [])];

export const DEFAULT_BLOCKS: BlockType[] = ["cover", "hero", "scratchdate", "countdown", "message", "program", "venue", "map", "transfer", "dresscode", "rsvp", "footer"];

let counter = 0;
export function newBlockId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeBlock(type: BlockType, locale: "it" | "en" = "it"): BlockInstance {
  const def = blockDef(type);
  if (!def) throw new Error(`blocco sconosciuto: ${type}`);
  const base = locale === "en" && def.defaultsEn ? def.defaultsEn : def.defaults;
  return { id: newBlockId(), type, props: JSON.parse(JSON.stringify(base)) };
}

export function defaultBlocks(features: ReadonlySet<AddonKey> | AddonKey[]): BlockInstance[] {
  const has = (k?: AddonKey) => !k || (Array.isArray(features) ? features.includes(k) : features.has(k));
  return DEFAULT_BLOCKS.map((t) => blockDef(t)!).filter((d) => has(d.feature)).map((d) => makeBlock(d.type));
}
