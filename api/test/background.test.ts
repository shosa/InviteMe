import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADDON_KEYS, sanitizeBackground, sanitizeBlocks } from "@inviteme/shared";
import { loadThemes, sampleConfig } from "../src/engine/themes";
import { renderInvitePage } from "../src/engine/page";

const runtime = "/* runtime di test */";
const features = new Set(ADDON_KEYS);

describe("sfondi animati: validazione", () => {
  it("accetta solo i tipi noti e un colore #RRGGBB", () => {
    assert.deepEqual(sanitizeBackground({ kind: "bubbles", color: "#B8924A" }), { kind: "bubbles", color: "#b8924a" });
    assert.deepEqual(sanitizeBackground({ kind: "snow" }), { kind: "snow" });
    assert.equal(sanitizeBackground({ kind: "lasers" }), undefined);
    assert.deepEqual(sanitizeBackground({ kind: "confetti", color: "red" }), { kind: "confetti" });
  });

  it("«none» è una scelta esplicita: spegne lo sfondo dello stile", () => {
    assert.deepEqual(sanitizeBackground({ kind: "none", color: "#ffffff" }), { kind: "none" });
  });

  it("l'invito non salva uno sfondo non valido", () => {
    const blocks = sanitizeBlocks([{ id: "a", type: "message", props: {} }], features);
    assert.equal(blocks.length, 1);
    assert.equal(sanitizeBackground("confetti"), undefined);
  });
});

describe("sfondi animati: pagina", () => {
  const theme = loadThemes().themes[0];

  it("senza sfondo non c'è alcun canvas", () => {
    const html = renderInvitePage({ theme, config: sampleConfig(theme.manifest), slug: "x", features, runtime, preview: false });
    assert.doesNotMatch(html, /class="bg-fx"/);
  });

  it("lo sfondo scelto dal cliente compare con il suo colore", () => {
    const config = sampleConfig(theme.manifest);
    config.background = { kind: "confetti", color: "#b8924a" };
    const html = renderInvitePage({ theme, config, slug: "x", features, runtime, preview: false });
    assert.match(html, /<canvas class="bg-fx" data-bg="confetti" data-bg-color="#b8924a" aria-hidden="true"><\/canvas>/);
  });

  it("senza scelta del cliente vale il predefinito dello stile", () => {
    const withDefault = { ...theme, manifest: { ...theme.manifest, background: { kind: "waves" as const } } };
    const html = renderInvitePage({ theme: withDefault, config: sampleConfig(theme.manifest), slug: "x", features, runtime, preview: false });
    assert.match(html, /data-bg="waves"/);
  });

  it("«none» del cliente vince sul predefinito dello stile", () => {
    const withDefault = { ...theme, manifest: { ...theme.manifest, background: { kind: "waves" as const } } };
    const config = sampleConfig(theme.manifest);
    config.background = { kind: "none" };
    const html = renderInvitePage({ theme: withDefault, config, slug: "x", features, runtime, preview: false });
    assert.doesNotMatch(html, /class="bg-fx"/);
  });
});
