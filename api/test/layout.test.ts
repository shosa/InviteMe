import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADDON_KEYS, sanitizeLayout } from "@inviteme/shared";
import { loadThemes, sampleConfig } from "../src/engine/themes";
import { renderInvitePage } from "../src/engine/page";

const runtime = "/* runtime di test */";

describe("posizione libera dei blocchi", () => {
  it("valida x, w e dy e rifiuta ciò che non è un numero", () => {
    assert.equal(sanitizeLayout(undefined), undefined);
    assert.equal(sanitizeLayout({ x: "a", w: 50, dy: 0 }), undefined);
    assert.deepEqual(sanitizeLayout({ x: 10, w: 60, dy: 20 }), { x: 10, w: 60, dy: 20 });
    // larghezza minima 20%, e x non può uscire dalla pagina
    assert.deepEqual(sanitizeLayout({ x: 95, w: 5, dy: 0 }), { x: 80, w: 20, dy: 0 });
    assert.deepEqual(sanitizeLayout({ x: 0, w: 100, dy: 9999 }), { x: 0, w: 100, dy: 400 });
    // posizione identica al flusso normale: nessun dato da salvare
    assert.equal(sanitizeLayout({ x: 0, w: 100, dy: 0 }), undefined);
  });

  it("un blocco con posizione viene avvolto; senza posizione la pagina è identica", () => {
    const theme = loadThemes().themes.find((t) => t.manifest.id === "minimo")!;
    assert.ok(theme, "tema minimo caricato");
    const base = sampleConfig(theme.manifest);
    const plain = renderInvitePage({ theme, config: base, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.doesNotMatch(plain, /bk-place/);

    const target = base.blocks.find((b) => b.type === "message")!;
    const moved = { ...base, blocks: base.blocks.map((b) => (b.id === target.id ? { ...b, layout: { x: 20, w: 60, dy: 12 } } : b)) };
    const html = renderInvitePage({ theme, config: moved, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.match(html, /class="bk-place" style="position:relative;left:20%;width:60%;margin-top:12px"/);
  });
});
