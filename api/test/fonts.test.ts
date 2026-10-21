import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADDON_KEYS, fontStack, fontsStylesheetUrl, sanitizeFontMap, sanitizeBlocks, defaultConfig, type InviteConfig } from "@inviteme/shared";
import { loadThemes, sampleConfig } from "../src/engine/themes";
import { renderInvitePage } from "../src/engine/page";

const runtime = "/* runtime di test */";

describe("font per campo: validazione", () => {
  it("tiene solo gli id della libreria sui campi indicati", () => {
    const map = sanitizeFontMap(["heading", "body"], { heading: "Lora", body: "Comic Sans", other: "Lora" });
    assert.deepEqual(map, { heading: "Lora" });
  });

  it("un valore non valido o un campo estraneo non lasciano nulla", () => {
    assert.equal(sanitizeFontMap(["heading"], { heading: "<img src=x>" }), undefined);
    assert.equal(sanitizeFontMap(["heading"], "Lora"), undefined);
    assert.equal(sanitizeFontMap(["heading"], undefined), undefined);
  });

  it("lo stack CSS viene solo dalla libreria", () => {
    assert.equal(fontStack("Lora"), "'Lora', Georgia, serif");
    assert.equal(fontStack("Font inventato"), undefined);
  });

  it("il foglio Google contiene solo le famiglie richieste", () => {
    const url = fontsStylesheetUrl(["Lora"]);
    assert.match(url, /^https:\/\/fonts\.googleapis\.com\/css2\?family=Lora:wght@400;700&display=swap$/);
  });
});

describe("font per campo: configurazione", () => {
  it("un blocco salva solo i font dei suoi campi di testo", () => {
    const theme = loadThemes().themes[0];
    const config = defaultConfig(theme.manifest, "invitation-rsvp", "wedding", new Set(ADDON_KEYS)) as InviteConfig;
    const message = config.blocks.find((b) => b.type === "message")!;
    message.props = { ...message.props, fonts: { heading: "Lora", photo: "Lora", body: "Nope" } };
    const clean = sanitizeBlocks(JSON.parse(JSON.stringify(config.blocks)), new Set(ADDON_KEYS));
    const saved = clean.find((b) => b.type === "message")!;
    assert.deepEqual(saved.props.fonts, { heading: "Lora" });
  });
});

describe("font per campo: pagina", () => {
  const loaded = loadThemes();
  const theme = loaded.themes[0];

  it("solo il campo scelto prende il font; gli altri restano del tema", () => {
    const config = sampleConfig(theme.manifest);
    const message = config.blocks.find((b) => b.type === "message")!;
    message.props = { ...message.props, heading: "Benvenuti", body: "Testo", fonts: { heading: "Lora" } };
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: false });
    assert.match(html, /<span style="font-family:'Lora', Georgia, serif">Benvenuti<\/span>/);
    assert.doesNotMatch(html, /<span style="font-family:'Lora'[^>]*>Testo</);
    assert.match(html, /family=Lora:wght@400;700/);
  });

  it("un font malevolo nel dato non arriva alla pagina", () => {
    const config = sampleConfig(theme.manifest);
    const message = config.blocks.find((b) => b.type === "message")!;
    message.props = { ...message.props, heading: "Ciao", fonts: { heading: "x'><script>alert(1)</script>" } };
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: false });
    assert.doesNotMatch(html, /<script>alert\(1\)/);
    assert.doesNotMatch(html, /font-family:'x/);
  });
});
