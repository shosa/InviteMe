import type { Lang } from "@/lib/ui";

// Testi inglesi del catalogo, indicizzati per id. In italiano restano quelli del catalogo.
// Se manca una voce, la pagina mostra il testo del catalogo.
export const MODEL_COPY_EN: Record<string, { name: string; tagline: string; description: string }> = {
  "save-the-date": {
    name: "Save the Date",
    tagline: "Announce the date with a single image",
    description: "An elegant card with photo, names and date. The full details come later.",
  },
  "invitation-rsvp": {
    name: "Invitation with RSVP",
    tagline: "All the details and replies in one link",
    description: "A full invitation with programme and attendance form. Map, music and other features are added separately.",
  },
  custom: {
    name: "Custom",
    tagline: "Build the invitation feature by feature",
    description: "Start from the base and add only what you need. Each feature has a fixed price, visible before payment.",
  },
};

export const ADDON_COPY_EN: Record<string, { label: string; description: string }> = {
  rsvp: { label: "Attendance reply", description: "Reply form with custom questions" },
  program: { label: "Detailed programme", description: "Up to 5 entries: ceremony, dinner, party" },
  map: { label: "Map and directions", description: "Map of the venue with a link to directions" },
  music: { label: "Background music", description: "A track from the library, or your own file" },
  countdown: { label: "Countdown", description: "Days, hours, minutes and seconds to the date" },
  gallery: { label: "Photo gallery", description: "Up to 6 photos instead of 3" },
  express: { label: "Express delivery 24–48 h", description: "Priority when going live" },
};

export function modelCopy(id: string, name: string, tagline: string, description: string, lang: Lang) {
  const en = lang === "en" ? MODEL_COPY_EN[id] : undefined;
  return en ?? { name, tagline, description };
}

export function addonCopy(key: string, label: string, description: string, lang: Lang) {
  const en = lang === "en" ? ADDON_COPY_EN[key] : undefined;
  return en ?? { label, description };
}

// Nomi dei blocchi, dei campi (per tipo di blocco o evento) e dei template in inglese.
export const BLOCK_COPY_EN: Record<string, string> = {
  cover: "Envelope",
  hero: "Header",
  scratchdate: "Scratch date",
  countdown: "Countdown",
  message: "Message",
  gallery: "Gallery",
  program: "Programme",
  venue: "Venue",
  map: "Map",
  transfer: "How to get there",
  dresscode: "Dress code",
  video: "Video",
  music: "Music",
  rsvp: "Attendance reply",
  footer: "Signature",
};

const FIELD_COPY_EN: Record<string, string> = {
  title: "Names or title",
  hosts: "Line under the names",
  eventDate: "Date",
  eventTime: "Start time",
  venue: "Venue",
  address: "Address",
  time: "Time",
  label: "What",
  coverVideo: "Envelope video (silent, max 90 s)",
  coverSound: "Sound on opening",
  occasion: "Subtitle",
  couplePhoto: "Main photo",
  heading: "Title",
  body: "Text",
  photos: "Photos",
  items: "Entries",
  photo: "Venue photo",
  dress: "Dress code",
  video: "Video (silent, max 90 s)",
  music: "Track (mp3, max 6 MB)",
  intro: "Intro text",
  signature: "Signature",
  "transfer.body": "Directions",
};

const THEME_COPY_EN: Record<string, string> = {
  "anniversario-oro": "Golden velvet",
  "argento-anniversario": "Silver moonlight",
  "autunno-cena": "October dusk",
  "baby-shower": "Silken clouds",
  "battesimo-celeste": "Heavenly hush",
  "compleanno-festa": "Midnight confetti",
  "festa-spiaggia": "Summer tide",
  "gala-aziendale": "Gala night",
  "giardino": "Secret garden",
  "invitereference": "Arch of light",
  "laurea-giulia": "Laurel and gold",
  "lavanda-nozze": "Lavender bloom",
  "matrimonio-citta": "City of silk",
  "matrimonio-lago": "Lakeside reflections",
  "minimo": "Elegant hush",
  "notturno": "Beneath the stars",
  "pensionamento": "New horizons",
  "prima-comunione": "Little light",
  "redazione": "Author's page",
  "rivista": "Paper pages",
  "velo": "Veil of mist",
};

export function blockCopy(type: string, label: string, lang: Lang) {
  return lang === "en" ? (BLOCK_COPY_EN[type] ?? label) : label;
}

// Chiave del campo: `tipo.chiave` se esiste una traduzione specifica, altrimenti solo la chiave.
export function fieldCopy(type: string, key: string, label: string, lang: Lang) {
  if (lang !== "en") return label;
  return FIELD_COPY_EN[`${type}.${key}`] ?? FIELD_COPY_EN[key] ?? label;
}

export function themeCopy(id: string, name: string, lang: Lang) {
  return lang === "en" ? (THEME_COPY_EN[id] ?? name) : name;
}
