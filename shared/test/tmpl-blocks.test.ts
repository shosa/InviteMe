import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATALOG, defaultConfig, getTheme, activeFeatures, getModel, type Catalog } from "../src/index";

describe("blocchi del tema alla creazione", () => {
  const c = { ...DEFAULT_CATALOG, themes: [], music: [] } as Catalog;
  const theme = { id: "prova", name: "Prova", description: "", models: [], themeColor: "#000000", fonts: [], demo: { hero: {}, gallery: { photos: [] }, venue: {}, video: {}, scratchdate: {}, cover: {} } } as never;
  it("porta nel config i blocchi previsti dalla demo, busta e intestazione sempre", () => {
    const m = getModel(c, "invitation-rsvp")!;
    const cfg = defaultConfig(theme, m.id, "wedding", activeFeatures(c, m.id, []));
    const types = cfg.blocks.map((b) => b.type);
    assert.equal(types[0], "cover");
    assert.ok(types.includes("hero"));
    assert.ok(types.includes("venue"));
    assert.ok(!types.includes("date"));
  });
  it("le funzioni non incluse nel modello restano fuori dal config", () => {
    const m = getModel(c, "save-the-date")!;
    const cfg = defaultConfig(theme, m.id, "wedding", activeFeatures(c, m.id, []));
    assert.ok(!cfg.blocks.some((b) => b.type === "gallery"));
  });
  void getTheme;
});
