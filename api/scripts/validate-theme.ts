// Valida uno o più stili (cartelle con theme.json, theme.css, assets/) e i template dei blocchi.
// Uso: npm run validate-theme -w @inviteme/api -- [cartella ...]   (senza argomenti: tutti gli stili in themes/)
import fs from "fs";
import path from "path";
import { loadTheme, THEMES_DIR } from "../src/engine/themes";
import { blockPartials } from "../src/engine/blocks";

const args = process.argv.slice(2);
// npm esegue lo script dalla cartella del pacchetto (api/): i percorsi si risolvono da dove si è lanciato il comando.
const from = process.env.INIT_CWD ?? process.cwd();
const dirs = args.length
  ? args.map((a) => path.resolve(from, a))
  : fs.readdirSync(THEMES_DIR).map((n) => path.join(THEMES_DIR, n)).filter((d) => fs.statSync(d).isDirectory() && !path.basename(d).startsWith("_"));

let failed = 0;
for (const e of blockPartials().errors) {
  console.error(`errore    ${e}`);
  failed++;
}

for (const dir of dirs) {
  const r = loadTheme(dir);
  for (const w of r.warnings) console.warn(`avviso    ${w}`);
  for (const e of r.errors) console.error(`errore    ${e}`);
  if (r.theme) console.log(`ok       ${r.theme.manifest.id}: ${Object.keys(r.theme.manifest.demo).length} blocchi di esempio`);
  else failed++;
}
console.log(failed ? `\n${failed} problema/i: lo stile non può essere pubblicato.` : "\nTutti gli stili sono validi.");
process.exit(failed ? 1 : 0);
