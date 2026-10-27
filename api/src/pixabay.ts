// Ricerca e importazione di foto da Pixabay. La chiave resta sul server: il browser chiede solo per testo o per id.
import { pool } from "./db";
import { INPUT_TYPES, MediaError, convertMedia } from "./media";

const SEARCH_URL = "https://pixabay.com/api/";
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;
// Pixabay chiede di tenere in cache le risposte per 24 ore e di non riscaricare le stesse immagini.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
// Attese tra un tentativo e l'altro quando Pixabay risponde 429 (limite momentaneo).
let retryDelaysMs = [1000, 3000];
export function setRetryDelaysForTests(delays: number[]) {
  retryDelaysMs = delays;
}
const SATURATED = "Pixabay è momentaneamente saturo, riprova tra un minuto";

const searchCache = new Map<string, { at: number; photos: StockPhoto[] }>();

export class StockError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type StockPhoto = { id: number; preview: string; user: string; pageUrl: string; width: number; height: number; tags: string };

type Hit = { id: number; previewURL: string; largeImageURL: string; user: string; pageURL: string; imageWidth: number; imageHeight: number; tags: string };

// Filtri ammessi dalla documentazione dell'API Pixabay (pixabay.com/api/docs). Ogni valore sconosciuto è rifiutato.
export const STOCK_TYPES = ["all", "photo", "illustration"] as const;
export const STOCK_ORIENTATIONS = ["all", "horizontal", "vertical"] as const;
export const STOCK_ORDERS = ["popular", "latest"] as const;
// "transparent" è il filtro dell'API per le immagini con sfondo trasparente: l'unico modo per cercare la trasparenza.
export const STOCK_COLORS = ["grayscale", "transparent", "red", "orange", "yellow", "green", "turquoise", "blue", "lilac", "pink", "white", "gray", "black", "brown"] as const;
export const STOCK_CATEGORIES = ["backgrounds", "fashion", "nature", "science", "education", "feelings", "health", "people", "religion", "places", "animals", "industry", "computer", "food", "sports", "transportation", "travel", "buildings", "business", "music"] as const;
export const STOCK_MIN_WIDTHS = [0, 1280, 1920, 3000] as const;

export type StockFilters = {
  q: string;
  lang: "it" | "en";
  type: (typeof STOCK_TYPES)[number];
  orientation: (typeof STOCK_ORIENTATIONS)[number];
  order: (typeof STOCK_ORDERS)[number];
  color?: (typeof STOCK_COLORS)[number];
  category?: (typeof STOCK_CATEGORIES)[number];
  editorsChoice: boolean;
  minWidth: (typeof STOCK_MIN_WIDTHS)[number];
  page: number;
};

// Legge i filtri dalla richiesta: tutto ciò che non è nell'elenco ammesso cade sul valore predefinito, la ricerca vuota è un errore.
function pick<T extends string | number>(list: readonly T[], value: unknown, fallback: T): T {
  return list.find((v) => String(v) === String(value)) ?? fallback;
}

export function parseStockFilters(query: Record<string, unknown>): StockFilters {
  const q = String(query.q ?? "").trim();
  if (q.length < 2 || q.length > 100) throw new StockError("Scrivi almeno 2 lettere", 400);
  const color = pick<string>([...STOCK_COLORS], query.color, "");
  const category = pick<string>([...STOCK_CATEGORIES], query.category, "");
  const page = Math.min(20, Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  return {
    q,
    lang: query.lang === "en" ? "en" : "it",
    type: pick([...STOCK_TYPES], query.type, "all"),
    orientation: pick([...STOCK_ORIENTATIONS], query.orientation, "all"),
    order: pick([...STOCK_ORDERS], query.order, "popular"),
    color: color ? (color as StockFilters["color"]) : undefined,
    category: category ? (category as StockFilters["category"]) : undefined,
    editorsChoice: query.editorsChoice === "true" || query.editorsChoice === true,
    minWidth: pick([...STOCK_MIN_WIDTHS], Number(query.minWidth ?? 0), 0),
    page,
  };
}

function apiKey(): string {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) throw new StockError("Ricerca immagini non configurata", 503);
  return key;
}

// Solo https verso pixabay.com: le immagini importate non possono arrivare da altri siti.
export function trustedHost(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === "https:" && (url.hostname === "pixabay.com" || url.hostname.endsWith(".pixabay.com"));
}

// Riprova solo sui 429, con attesa crescente. Se il limite persiste restituisce l'ultima risposta.
async function fetchWithRetry(url: string | URL, timeoutMs: number): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status !== 429 || attempt >= retryDelaysMs.length) return res;
    await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
  }
}

async function callApi(params: Record<string, string>): Promise<Hit[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("key", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetchWithRetry(url, 8000);
  } catch {
    // L'errore del fetch può contenere l'indirizzo con la chiave: non lo si inoltra.
    throw new StockError("Pixabay non risponde, riprova", 502);
  }
  if (res.status === 429) throw new StockError(SATURATED, 429);
  if (!res.ok) throw new StockError("Pixabay ha rifiutato la richiesta", 502);
  const body = (await res.json().catch(() => null)) as { hits?: Hit[] } | null;
  return body?.hits ?? [];
}

// Stessa ricerca entro 24 ore: risposta dalla cache, nessuna chiamata a Pixabay.
export async function searchStock(f: StockFilters): Promise<StockPhoto[]> {
  const cacheKey = JSON.stringify(f);
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.photos;
  const photos = await searchRemote(f);
  searchCache.delete(cacheKey);
  searchCache.set(cacheKey, { at: Date.now(), photos });
  if (searchCache.size > CACHE_MAX_ENTRIES) searchCache.delete(searchCache.keys().next().value as string);
  return photos;
}

async function searchRemote(f: StockFilters): Promise<StockPhoto[]> {
  const params: Record<string, string> = {
    q: f.q,
    lang: f.lang,
    image_type: f.type,
    orientation: f.orientation,
    order: f.order,
    safesearch: "true",
    per_page: "24",
    page: String(f.page),
  };
  if (f.color) params.colors = f.color;
  if (f.category) params.category = f.category;
  if (f.editorsChoice) params.editors_choice = "true";
  if (f.minWidth > 0) params.min_width = String(f.minWidth);
  const hits = await callApi(params);
  return hits.map((h) => ({ id: h.id, preview: h.previewURL, user: h.user, pageUrl: h.pageURL, width: h.imageWidth, height: h.imageHeight, tags: h.tags }));
}

async function download(raw: string): Promise<{ buffer: Buffer; mime: string }> {
  if (!trustedHost(raw)) throw new StockError("Immagine non ammessa", 502);
  let res: Response;
  try {
    res = await fetchWithRetry(raw, 15000);
  } catch {
    throw new StockError("Download dell'immagine non riuscito", 502);
  }
  if (res.status === 429) throw new StockError(SATURATED, 429);
  if (!res.ok || !trustedHost(res.url)) throw new StockError("Download dell'immagine non riuscito", 502);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_DOWNLOAD_BYTES) throw new StockError("Immagine troppo grande", 413);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_DOWNLOAD_BYTES) throw new StockError("Immagine troppo grande", 413);
  return { buffer, mime: (res.headers.get("content-type") ?? "").split(";")[0].trim() };
}

// Scarica la foto scelta (dal suo id, non da un indirizzo del browser), la converte come un upload normale e la salva.
// Una foto già importata non si riscarica: si riusa il file salvato sul nostro storage.
export async function importStock(id: number): Promise<{ url: string; bytes: number }> {
  const { rows } = await pool.query("SELECT url, bytes FROM stock_imports WHERE pixabay_id = $1", [id]);
  if (rows[0]) return { url: rows[0].url, bytes: rows[0].bytes };
  const [hit] = await callApi({ id: String(id) });
  if (!hit?.largeImageURL) throw new StockError("Foto non trovata", 404);
  const { buffer, mime } = await download(hit.largeImageURL);
  const ext = INPUT_TYPES.photo[mime];
  if (!ext) throw new StockError("Formato non supportato", 415);
  try {
    const saved = await convertMedia("photo", buffer, ext);
    await pool.query(
      "INSERT INTO stock_imports (pixabay_id, url, bytes) VALUES ($1, $2, $3) ON CONFLICT (pixabay_id) DO NOTHING",
      [id, saved.url, saved.bytes],
    );
    return { url: saved.url, bytes: saved.bytes };
  } catch (e) {
    if (e instanceof MediaError) throw new StockError(e.message, e.status);
    throw e;
  }
}
