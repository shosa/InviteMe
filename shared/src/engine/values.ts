import type { AddonKey } from "../addons";
import { isRecord, type FieldDef } from "./manifest";

// File caricati dal cliente: solo quelli prodotti dalla pipeline ffmpeg (api/src/media.ts), mai un URL esterno.
export const MEDIA_URL = /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|mp4|mp3)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

const TEXT_MAX = 200;
const LONG_MAX = 1500;
const PHOTOS_MAX = 6;
const LIST_MAX = 12;

// Valore vuoto di un campo: quello che il template riceve quando il cliente non ha compilato nulla.
export function emptyValue(f: FieldDef): unknown {
  if (f.type === "list" || f.type === "photos") return [];
  if (f.type === "number") return typeof f.default === "number" ? f.default : 0;
  if (f.type === "toggle") return typeof f.default === "boolean" ? f.default : false;
  if (f.type === "text" || f.type === "longtext" || f.type === "date" || f.type === "time") return typeof f.default === "string" ? f.default : "";
  return "";
}

// Ricostruisce i valori dei campi dal input del client. Nessun campo è fidato: tipi, lunghezze e URL vengono verificati.
// I campi legati a una funzione non acquistata restano vuoti, così il template non li mostra.
export function sanitizeValues(fields: FieldDef[], input: unknown, active: ReadonlySet<AddonKey>): Record<string, unknown> {
  const src = isRecord(input) ? input : {};
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    out[f.key] = f.feature && !active.has(f.feature) ? emptyValue(f) : sanitizeField(f, src[f.key]);
  }
  return out;
}

function sanitizeField(f: FieldDef, v: unknown): unknown {
  switch (f.type) {
    case "toggle":
      return typeof v === "boolean" ? v : emptyValue(f);
    case "text":
      return text(v, f.max ?? TEXT_MAX, f);
    case "longtext":
      return text(v, f.max ?? LONG_MAX, f);
    case "date":
      return typeof v === "string" && DATE.test(v) ? v : emptyValue(f);
    case "time":
      return typeof v === "string" && TIME.test(v) ? v : emptyValue(f);
    case "number": {
      const n = typeof v === "number" ? v : Number(v);
      const max = f.max ?? 1000;
      return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : emptyValue(f);
    }
    case "url":
      return typeof v === "string" && /^https:\/\/[^\s"'<>]{4,500}$/.test(v) ? v : "";
    case "photo":
      return mediaUrl(v, ["jpg", "png"]);
    case "video":
      return mediaUrl(v, ["mp4"]);
    case "audio":
      return mediaUrl(v, ["mp3"]);
    case "photos":
      return Array.isArray(v) ? v.map((p) => mediaUrl(p, ["jpg", "png"])).filter(Boolean).slice(0, f.max ?? PHOTOS_MAX) : [];
    case "list":
      return Array.isArray(v)
        ? v.filter(isRecord).slice(0, f.max ?? LIST_MAX).map((item) => sanitizeItem(f.item ?? [], item))
        : [];
    case "color":
      // Vuoto = colore del tema. Solo esadecimali a sei cifre: il valore finisce in uno stile inline.
      return typeof v === "string" && HEX.test(v) ? v.toLowerCase() : "";
    case "choice":
      return typeof v === "string" && (f.options ?? []).some((o) => o.value === v) ? v : "";
  }
}

function sanitizeItem(fields: FieldDef[], item: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.key] = sanitizeField(f, item[f.key]);
  return out;
}

function text(v: unknown, max: number, f: FieldDef): string {
  if (typeof v !== "string") return typeof f.default === "string" ? f.default : "";
  // Gli a capo sono ammessi solo nei testi lunghi; negli altri campi diventano spazi.
  const clean = f.type === "longtext" ? v.replace(/\r\n?/g, "\n") : v.replace(/\s+/g, " ");
  return clean.slice(0, max).trim();
}

function mediaUrl(v: unknown, exts: string[]): string {
  return typeof v === "string" && MEDIA_URL.test(v) && exts.some((ext) => v.endsWith(`.${ext}`)) ? v : "";
}
