import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateManifest, sanitizeBlocks, type BlockInstance } from "../src/index";

const base = { engine: 2, id: "prova", name: "Prova", themeColor: "#000000", models: [], fonts: [], demo: {} };

describe("manifest degli stili", () => {
  it("accetta uno stile completo", () => {
    const r = validateManifest(base);
    assert.deepEqual(r.errors, []);
    assert.ok(r.manifest);
  });

  it("rifiuta font esterni e campi sconosciuti", () => {
    const r = validateManifest({ ...base, fonts: ["https://evil.example/x.css"], extra: 1 });
    assert.match(r.errors.join("\n"), /fonts: URL non ammesso/);
    assert.match(r.errors.join("\n"), /campo sconosciuto "extra"/);
  });

  it("rifiuta esempi con URL esterni o percorsi fuori dagli asset", () => {
    const r = validateManifest({ ...base, demo: { hero: { couplePhoto: "https://x.example/a.jpg" }, video: { video: "../segreto.mp4" } } });
    assert.match(r.errors.join("\n"), /niente URL esterni/);
    assert.match(r.errors.join("\n"), /percorso asset non valido/);
  });
});

describe("blocchi dell'invito", () => {
  const block = (type: string, extra: Partial<BlockInstance> = {}): BlockInstance => ({ id: `id-${type}-${Math.random().toString(36).slice(2, 6)}`, type: type as BlockInstance["type"], props: {}, ...extra });
  const all = new Set(["rsvp", "program", "map", "music", "countdown", "gallery", "express"] as const);

  it("scarta tipi sconosciuti e blocchi unici ripetuti", () => {
    const out = sanitizeBlocks([block("message"), block("alieno"), block("footer"), block("footer")], all as never);
    assert.deepEqual(out.map((b) => b.type), ["message", "footer"]);
  });

  it("scarta i blocchi legati a una funzione non acquistata", () => {
    const out = sanitizeBlocks([block("countdown"), block("message")], new Set() as never);
    assert.deepEqual(out.map((b) => b.type), ["message"]);
  });

  it("pulisce le proprietà e mantiene il flag di nascosto", () => {
    const out = sanitizeBlocks([block("message", { hidden: true, props: { heading: "<b>ok</b>", extra: "x", body: "a\nb" } })], all as never);
    assert.equal(out[0].hidden, true);
    assert.equal(out[0].props.heading, "<b>ok</b>");
    assert.equal("extra" in out[0].props, false);
  });
});
