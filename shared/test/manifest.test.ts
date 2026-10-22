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

describe("busta-video", () => {
  it("accetta un filmato del tema come busta", () => {
    const r = validateManifest({ ...base, envelope: { video: "assets/apertura.mp4" } });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.manifest?.envelope, { video: "assets/apertura.mp4" });
  });

  it("rifiuta percorsi esterni o formati non video", () => {
    assert.ok(validateManifest({ ...base, envelope: { video: "https://x.test/a.mp4" } }).errors.length > 0);
    assert.ok(validateManifest({ ...base, envelope: { video: "assets/busta.png" } }).errors.length > 0);
  });
});

describe("esempi in inglese", () => {
  it("accetta demoEn per blocco e rifiuta percorsi esterni", () => {
    const r = validateManifest({ ...base, demoEn: { hero: { occasion: "Wedding" } } });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.manifest?.demoEn, { hero: { occasion: "Wedding" } });
    assert.ok(validateManifest({ ...base, demoEn: { hero: { couplePhoto: "https://x.test/a.jpg" } } }).errors.length > 0);
  });
});

describe("video di sfondo per zona", () => {
  it("accetta un video per intestazione e uno per il corpo", () => {
    const r = validateManifest({ ...base, backgroundVideo: { hero: "assets/a.mp4", body: "assets/b.webm" } });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.manifest?.backgroundVideo, { hero: "assets/a.mp4", body: "assets/b.webm" });
  });

  it("rifiuta la forma a stringa, percorsi esterni e chiavi sconosciute", () => {
    assert.ok(validateManifest({ ...base, backgroundVideo: "assets/a.mp4" }).errors.length > 0);
    assert.ok(validateManifest({ ...base, backgroundVideo: { hero: "https://x.test/a.mp4" } }).errors.length > 0);
    assert.ok(validateManifest({ ...base, backgroundVideo: { intro: "assets/a.mp4" } }).errors.length > 0);
  });
});

describe("blocchi dell'invito", () => {
  const block = (type: string, extra: Partial<BlockInstance> = {}): BlockInstance => ({ id: `id-${type}-${Math.random().toString(36).slice(2, 6)}`, type: type as BlockInstance["type"], props: {}, ...extra });
  const all = new Set(["rsvp", "program", "map", "music", "countdown", "gallery"] as const);

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
