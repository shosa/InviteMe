// Ricerca e importazione di foto da Pixabay. La chiave resta sul server: il browser chiede solo per testo o per id.
import { INPUT_TYPES, MediaError, convertMedia } from "./media";

const SEARCH_URL = "https://pixabay.com/api/";
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

export class StockError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type StockPhoto = { id: number; preview: string; user: string; pageUrl: string; width: number; height: number };

type Hit = { id: number; previewURL: string; largeImageURL: string; user: string; pageURL: string; imageWidth: number; imageHeight: number };

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

async function callApi(params: Record<string, string>): Promise<Hit[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("key", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    // L'errore del fetch può contenere l'indirizzo con la chiave: non lo si inoltra.
    throw new StockError("Pixabay non risponde, riprova", 502);
  }
  if (!res.ok) throw new StockError("Pixabay ha rifiutato la richiesta", 502);
  const body = (await res.json().catch(() => null)) as { hits?: Hit[] } | null;
  return body?.hits ?? [];
}

export async function searchStock(query: string, page: number, lang: "it" | "en"): Promise<StockPhoto[]> {
  const hits = await callApi({ q: query, image_type: "photo", safesearch: "true", per_page: "24", page: String(page), lang });
  return hits.map((h) => ({ id: h.id, preview: h.previewURL, user: h.user, pageUrl: h.pageURL, width: h.imageWidth, height: h.imageHeight }));
}

async function download(raw: string): Promise<{ buffer: Buffer; mime: string }> {
  if (!trustedHost(raw)) throw new StockError("Immagine non ammessa", 502);
  let res: Response;
  try {
    res = await fetch(raw, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new StockError("Download dell'immagine non riuscito", 502);
  }
  if (!res.ok || !trustedHost(res.url)) throw new StockError("Download dell'immagine non riuscito", 502);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_DOWNLOAD_BYTES) throw new StockError("Immagine troppo grande", 413);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_DOWNLOAD_BYTES) throw new StockError("Immagine troppo grande", 413);
  return { buffer, mime: (res.headers.get("content-type") ?? "").split(";")[0].trim() };
}

// Scarica la foto scelta (dal suo id, non da un indirizzo del browser), la converte come un upload normale e la salva.
export async function importStock(id: number): Promise<{ url: string; bytes: number }> {
  const [hit] = await callApi({ id: String(id) });
  if (!hit?.largeImageURL) throw new StockError("Foto non trovata", 404);
  const { buffer, mime } = await download(hit.largeImageURL);
  const ext = INPUT_TYPES.photo[mime];
  if (!ext) throw new StockError("Formato non supportato", 415);
  try {
    const saved = await convertMedia("photo", buffer, ext);
    return { url: saved.url, bytes: saved.bytes };
  } catch (e) {
    if (e instanceof MediaError) throw new StockError(e.message, e.status);
    throw e;
  }
}
