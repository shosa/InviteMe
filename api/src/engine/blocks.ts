import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BLOCK_TYPES, parseTemplate, type BlockType, type TemplateNode } from "@inviteme/shared";

// Template di ogni tipo di blocco (engine/blocks/<tipo>.html). Il markup è condiviso da tutti gli stili:
// lo stile lo decide il CSS del tema, la struttura del blocco sta qui.
export const BLOCKS_DIR = process.env.BLOCKS_DIR ?? fileURLToPath(new URL("../../../engine/blocks", import.meta.url));

let cache: { partials: Map<BlockType, TemplateNode[]>; errors: string[] } | null = null;

export function blockPartials(): { partials: Map<BlockType, TemplateNode[]>; errors: string[] } {
  if (cache) return cache;
  const partials = new Map<BlockType, TemplateNode[]>();
  const errors: string[] = [];
  for (const type of BLOCK_TYPES) {
    const file = path.join(BLOCKS_DIR, `${type}.html`);
    if (!fs.existsSync(file)) {
      errors.push(`blocco "${type}": manca ${type}.html`);
      continue;
    }
    try {
      partials.set(type, parseTemplate(fs.readFileSync(file, "utf8")));
    } catch (e) {
      errors.push(`blocco "${type}": ${(e as Error).message}`);
    }
  }
  cache = { partials, errors };
  return cache;
}
