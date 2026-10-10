// Controlla un file tema prima del caricamento. Uso: npm run validate-theme -w @inviteme/api -- ../docs/examples/tema-esempio.json
import { readFileSync } from "node:fs";
import { validateTheme } from "@inviteme/shared";

const file = process.argv[2];
if (!file) {
  console.error("Uso: npm run validate-theme -w @inviteme/api -- <file.json>");
  process.exit(2);
}

let data: unknown;
try {
  data = JSON.parse(readFileSync(file, "utf8"));
} catch {
  console.error("Il file non è JSON valido.");
  process.exit(1);
}

const result = validateTheme(data);
if (result.theme) {
  console.log(`OK: tema "${result.theme.name}" (${result.theme.id}) valido.`);
  process.exit(0);
}
console.error("Tema non valido:");
for (const e of result.errors) console.error(`  - ${e}`);
process.exit(1);
