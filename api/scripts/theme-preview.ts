// Anteprima di uno stile con dati di esempio, in locale. Sceglie il tema dalla lista (o con --theme <id>) e avvia un server su 127.0.0.1.
// Uso: npm run preview-theme -w @inviteme/api -- [--theme <id>] [--lang en] [--port 4100]
// Nell'anteprima: / mostra l'invito con la busta; /?cover=0 mostra la demo senza busta. Ricaricando la pagina cambia l'esempio.
import fs from "fs";
import http from "http";
import path from "path";
import readline from "readline/promises";
import { ADDON_KEYS } from "@inviteme/shared";
import { loadThemes, sampleConfig, RUNTIME_PATH } from "../src/engine/themes";
import { renderInvitePage } from "../src/engine/page";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const port = Number(opt("--port") ?? 4100);
const lang = opt("--lang") === "en" ? "en" : "it";

const { themes, errors } = loadThemes();
if (errors.length) console.warn(`Attenzione: ${errors.length} problemi nei temi, vedi npm run validate-theme`);
if (!themes.length) {
  console.error("Nessuno stile trovato in themes/");
  process.exit(1);
}
const sorted = [...themes].sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));

async function pick(): Promise<string> {
  const byId = opt("--theme");
  if (byId) return byId;
  console.log("Stili disponibili:\n");
  sorted.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.manifest.id.padEnd(24)} ${t.manifest.name}`));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question("\nNumero o id dello stile: ")).trim();
    const n = Number(answer);
    const chosen = Number.isInteger(n) && n >= 1 && n <= sorted.length ? sorted[n - 1].manifest.id : answer;
    return chosen;
  } finally {
    rl.close();
  }
}

const id = await pick();
const theme = sorted.find((t) => t.manifest.id === id);
if (!theme) {
  console.error(`Stile non trovato: ${id}`);
  process.exit(1);
}

const runtime = fs.readFileSync(RUNTIME_PATH, "utf8");
const assetsDir = path.join(theme.dir, "assets");
const assetPrefix = `/api/themes/${theme.manifest.id}/assets/`;
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".css": "text/css" };

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname.startsWith(assetPrefix)) {
    // Solo i file dello stile, senza uscire dalla sua cartella.
    const file = path.normalize(path.join(assetsDir, decodeURIComponent(url.pathname.slice(assetPrefix.length))));
    if (!file.startsWith(assetsDir + path.sep) || !fs.existsSync(file)) {
      res.writeHead(404).end("non trovato");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
    return;
  }
  if (url.pathname !== "/") {
    res.writeHead(404).end("non trovato");
    return;
  }
  // Ogni caricamento genera un esempio diverso (nomi, date, luoghi), come nella demo del sito.
  const showCover = url.searchParams.get("cover") !== "0";
  const html = renderInvitePage({
    theme,
    config: sampleConfig(theme.manifest, lang),
    slug: "anteprima",
    features: new Set(ADDON_KEYS),
    runtime,
    preview: !showCover,
  });
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(html);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\nAnteprima di «${theme.manifest.name}» (${theme.manifest.id}), lingua ${lang}:`);
  console.log(`  http://127.0.0.1:${port}/          con la busta`);
  console.log(`  http://127.0.0.1:${port}/?cover=0  demo senza busta`);
  console.log("Ctrl+C per fermare. Il server ascolta solo sulla macchina locale.");
});
