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
  image: { label: "Image", description: "A full-width photo, uploaded or from Pixabay, with an optional caption" },
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
  date: "Date",
  countdown: "Countdown",
  message: "Message",
  gallery: "Gallery",
  image: "Image",
  program: "Programme",
  venue: "Location",
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
  "lookBg": "Background colour",
  "lookInk": "Text colour",
  "lookCover": "Cover colour",
  "lookShape": "Shape",
  "photoShape": "Photo shape",
  "photoFit": "Photo fit",
  "photoFocus": "Photo focus",
  "cover.topText": "Text above the envelope",
  "cover.sealText": "Seal text",
  "cover.envelopeColor": "Envelope colour",
  "cover.sealColor": "Seal colour",
  "cover.tapLabel": "Text to open the envelope",
  "hero.kicker": "Text above the names",
  "hero.scrollLabel": "Scroll text",
  "scratchdate.dateTitle": "Date title",
  "scratchdate.dayLabel": "Day label",
  "scratchdate.monthLabel": "Month label",
  "scratchdate.yearLabel": "Year label",
  "scratchdate.revealLabel": "Reveal text",
  "date.dateTitle": "Date title",
  "date.cellShape": "Cell shape",
  "date.showLabels": "Show labels",
  "gallery.galleryStyle": "Gallery style",
  "image.caption": "Caption",
  "venue.kind": "Type",
  "dresscode.dress": "Dress code",
  "dresscode.colors": "Colours",
  "rsvp.openLabel": "Button to open",
  "rsvp.submitLabel": "Send button",
  "rsvp.thanksLabel": "Thank-you message",
  "mapShape": "Map shape",
  "mapShape.theme": "As the style",
  "mapShape.square": "Square",
  "mapShape.arch": "Arch",
  "mapShape.circle": "Circle",
  "mapShape.rounded": "Rounded corners",
  "photoShape.arch": "Arch",
  "photoShape.circle": "Circle",
  "photoShape.oval": "Oval",
  "photoShape.rounded": "Rounded corners",
  "photoShape.diamond": "Diamond",
  "photoShape.hexagon": "Hexagon",
  "photoFit.contain": "Whole photo, no crop",
  "photoFit.cover": "Fill, crop the edges",
  "photoFocus.center": "Centre",
  "photoFocus.top": "Top",
  "photoFocus.bottom": "Bottom",
  "photoFocus.left": "Left",
  "photoFocus.right": "Right",
  "galleryStyle.slider": "Slider",
  "galleryStyle.mosaic": "Mosaic",
  "galleryStyle.grid": "Grid",
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
  "avorio-botanico": "Botanical ivory",
  "acquarello-blu": "Blue watercolour",
  "nozze-in-fiore": "Flowers in bloom",
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

// Descrizioni in inglese dei blocchi e degli stili (quelle in italiano sono nel catalogo).
const BLOCK_DESC_EN: Record<string, string> = {
  "cover": "An envelope that opens with a tap, with optional video and sound.",
  "hero": "Names, date and time of the event, subtitle and main photo.",
  "scratchdate": "Day, month and year to reveal with your finger.",
  "date": "Day, month and year in plain sight, always visible.",
  "countdown": "Days, hours, minutes and seconds to the date.",
  "message": "A free text with a title.",
  "gallery": "Up to six photos in a grid.",
  "image": "A full-width photo, uploaded or chosen from Pixabay, with an optional caption.",
  "program": "The day's timings on a timeline.",
  "venue": "Name and type of the place; the address is set in the Map.",
  "map": "Map of the place with a link to directions.",
  "transfer": "Shuttle, parking, directions.",
  "dresscode": "A dress code, highlighted.",
  "video": "A silent looping video that plays when it enters the screen.",
  "music": "Background music: it starts when the envelope opens, with a button to stop it.",
  "rsvp": "Reply form in a popup, with the questions you set up.",
  "footer": "Sign-off at the bottom of the page.",
};

const THEME_DESC_EN: Record<string, string> = {
  "acquarello-blu": "A blue and light-blue watercolour that flows behind the invitation: transparent paper, blue flowers and lots of light. For weddings, anniversaries and spring ceremonies.",
  "anniversario-oro": "Burgundy background and antique gold details, card panels. For fifty years of marriage and big milestones.",
  "argento-anniversario": "Twenty-five years together: a silver arch frame on white paper. For wedding anniversaries and family celebrations.",
  "autunno-cena": "Red leaves, pumpkins and candles on dark panels. For autumn dinners, birthdays and family gatherings.",
  "avorio-botanico": "Ivory paper, pink and sage flowers, gold details and a cinematic opening with a romantic feel.",
  "baby-shower": "Pastels, clouds and white flowers: a column of names and a scrolling programme. For baby showers and births.",
  "battesimo-celeste": "Sky and clouds in soft blues: a column of names and a scrolling programme. For christenings and first communions.",
  "compleanno-festa": "Warm, lively colours, cake and candles in front, big rounded titles. For birthdays and parties with friends.",
  "festa-spiaggia": "Sand, sea and cobalt blue, big titles and a column layout. For beach weddings, hen parties and summer parties.",
  "gala-aziendale": "Typography only on white, corporate blue and simple tables. For gala dinners, awards and company events.",
  "giardino": "Full-page forest-green background, card panels and mosaic photos. For outdoor evening events.",
  "invitereference": "Arch frame, gold ornaments on pink paper: a scratch-off date and a timeline programme.",
  "laurea-giulia": "Midnight blue and gold, classic lettering and the list of the day's stops. For graduations and big study milestones.",
  "lavanda-nozze": "Fields of lavender in soft violet, an arch frame and delicate flowers. For country weddings and outdoor ceremonies.",
  "matrimonio-citta": "City lights at night, rose gold and geometric lines. For urban ceremonies and receptions in palaces.",
  "matrimonio-lago": "A column of names over water and mountains, scrolling programme. For weddings by the lake and in the valleys.",
  "minimo": "Typography only: no ornaments, no photos. Wide spaces and thin lines for an essential invitation.",
  "notturno": "An evening ceremony: black background, thin white letters, geometric lines and a prominent countdown. For black-tie weddings.",
  "nozze-in-fiore": "A romantic and sumptuous announcement: peonies, ivory roses, eucalyptus, wax seal and gold frames, with floating petals.",
  "pensionamento": "Forest-green panels and gold details: an evening of thanks. For retirements and farewells.",
  "prima-comunione": "Arch frame on light paper and sage green: simple, devout, with restrained ornaments. For first communions and confirmations.",
  "redazione": "Magazine layout: a cover with the edition number, columns, thin rules and numbered sections like pages.",
  "rivista": "Two-column editorial layout, big titles, crisp rules. Made for lovers of fashion magazines.",
  "velo": "A vertical column of names in italics on ivory paper, light flowers and a horizontal scrolling programme. For romantic ceremonies.",
};

export function blockDescCopy(type: string, description: string, lang: Lang) {
  return lang === "en" ? (BLOCK_DESC_EN[type] ?? description) : description;
}

export function themeDescCopy(id: string, description: string, lang: Lang) {
  return lang === "en" ? (THEME_DESC_EN[id] ?? description) : description;
}
