import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { fileURLToPath } from "url";
import { ADDON_KEYS, BLOCKS, defaultConfig, DEFAULT_CATALOG, activeFeatures, getModel, type Catalog } from "@inviteme/shared";
import { loadTheme, loadThemes, sampleConfig, hasLeftoverTags } from "../src/engine/themes";
import { renderInvitePage } from "../src/engine/page";
import { blockPartials } from "../src/engine/blocks";

const here = path.dirname(fileURLToPath(import.meta.url));
const runtime = "/* runtime di test */";

describe("template dei blocchi", () => {
  it("c'è un template per ogni tipo di blocco e compila", () => {
    const { partials, errors } = blockPartials();
    assert.deepEqual(errors, []);
    assert.equal(partials.size, BLOCKS.length);
  });
});

describe("stili del repository", () => {
  const loaded = loadThemes();

  it("caricano senza errori", () => {
    assert.deepEqual(loaded.errors, []);
    assert.deepEqual(loaded.themes.map((t) => t.manifest.id).sort(), ["acquarello-blu", "anniversario-oro", "argento-anniversario", "autunno-cena", "avorio-botanico", "baby-shower", "battesimo-celeste", "compleanno-festa", "festa-spiaggia", "gala-aziendale", "giardino", "invitereference", "laurea-giulia", "lavanda-nozze", "matrimonio-citta", "matrimonio-lago", "minimo", "notturno", "nozze-in-fiore", "pensionamento", "prima-comunione", "redazione", "rivista", "velo"]);
  });

  it("la demo con tutti i blocchi non lascia segnaposti e non perde dati", () => {
    const theme = loaded.themes[0];
    const missing = new Set<string>();
    const html = renderInvitePage({ theme, config: sampleConfig(theme.manifest), slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true, missing });
    assert.deepEqual([...missing], []);
    assert.equal(hasLeftoverTags(html), false);
    assert.doesNotMatch(html, /<script src=/);
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  });

  it("gli asset relativi vengono riscritti sul percorso pubblico", () => {
    const theme = loaded.themes.find((t) => t.manifest.id === "invitereference")!;
    const html = renderInvitePage({ theme, config: sampleConfig(theme.manifest), slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.match(html, /src="\/api\/themes\/invitereference\/assets\/floral-corner\.png"/);
    assert.doesNotMatch(html, /src="assets\//);
    assert.match(theme.css, /url\("assets\/ornament\.svg"\)/); // il sorgente resta relativo
  });

  it("in anteprima la busta non compare; nella pagina pubblica sì", () => {
    const theme = loaded.themes[0];
    const config = sampleConfig(theme.manifest);
    const preview = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    const live = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: false });
    assert.doesNotMatch(preview, /<div data-cover /);
    assert.match(live, /<div data-cover /);
  });

  it("un blocco nascosto non compare", () => {
    const theme = loaded.themes[0];
    const config = sampleConfig(theme.manifest);
    config.blocks = config.blocks.map((b) => (b.type === "dresscode" ? { ...b, hidden: true } : b));
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.doesNotMatch(html, /Black tie/);
  });
});

describe("pagina invito: sicurezza dei dati del cliente", () => {
  const theme = loadThemes().themes[0];

  it("titolo e messaggio malevoli vengono escapati ovunque", () => {
    const config = sampleConfig(theme.manifest);
    config.event.title = `</title><script>alert(1)</script>`;
    config.blocks = config.blocks.map((b) => (b.type === "message" ? { ...b, props: { ...b.props, body: `"><img src=x onerror=alert(2)>` } } : b));
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.doesNotMatch(html, /<script>alert/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;\/title&gt;&lt;script&gt;/);
  });

  it("i dati JSON della pagina non possono chiudere lo script", () => {
    const config = sampleConfig(theme.manifest);
    config.event.title = "</script><script>alert(3)</script>";
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.doesNotMatch(html, /<\/script><script>alert\(3\)/);
  });
});

describe("busta-video", () => {
  const loaded = loadThemes();
  const theme = loaded.themes.find((t) => t.manifest.id === "avorio-botanico")!;

  it("la busta del tema è il filmato, e il blocco Busta non porta proprietà dell'invito", () => {
    const config = sampleConfig(theme.manifest);
    const cover = config.blocks.find((b) => b.type === "cover")!;
    cover.props = { topText: "Testo da ignorare", sealText: "X", coverVideo: "assets/altro.mp4" };
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime });
    assert.match(html, /<video data-cover-video[^>]*src="\/api\/themes\/avorio-botanico\/assets\/apertura\.mp4"/);
    assert.doesNotMatch(html, /Testo da ignorare|altro\.mp4|class="env-card"/);
  });

  it("gli stili con busta disegnata restano invariati", () => {
    const other = loaded.themes.find((t) => t.manifest.id === "minimo")!;
    const config = sampleConfig(other.manifest);
    config.blocks = config.blocks.map((b) => (b.type === "cover" ? { ...b, props: { ...b.props, coverVideo: "" } } : b));
    const html = renderInvitePage({ theme: other, config, slug: "x", features: new Set(ADDON_KEYS), runtime });
    assert.match(html, /class="env-card"/);
    assert.doesNotMatch(html, /<video data-cover-video/);
  });
});

describe("video di sfondo per zona", () => {
  const loaded = loadThemes();
  const theme = loaded.themes.find((t) => t.manifest.id === "acquarello-blu")!;

  it("l'intestazione ha il suo video nella sua zona; il corpo ha un video fisso sotto, con loop", () => {
    const html = renderInvitePage({ theme, config: sampleConfig(theme.manifest), slug: "x", features: new Set(ADDON_KEYS), runtime });
    const hero = html.match(/<div class="zone zone-hero">(<video[^>]*>)/);
    const body = html.match(/(<video class="zone-video zone-fixed" data-zone-video="body"[^>]*>)/);
    assert.ok(hero, "zona intestazione con video");
    assert.ok(body, "video fisso del corpo");
    assert.ok(html.indexOf(body[1]) < html.indexOf('<div class="zone zone-hero">'), "il video del corpo sta sotto l'intestazione");
    assert.match(hero[1], /src="\/api\/themes\/acquarello-blu\/assets\/intestazione-palme\.mp4"/);
    assert.match(body[1], /src="\/api\/themes\/acquarello-blu\/assets\/acquarello\.mp4"/);
    for (const v of [hero[1], body[1]]) {
      assert.match(v, / loop/);
      assert.match(v, / muted/);
    }
  });

  it("la busta del tema è il filmato dedicato", () => {
    const html = renderInvitePage({ theme, config: sampleConfig(theme.manifest), slug: "x", features: new Set(ADDON_KEYS), runtime });
    assert.match(html, /<video data-cover-video[^>]*src="\/api\/themes\/acquarello-blu\/assets\/busta\.mp4"/);
  });

  it("uno stile senza video di sfondo non ha zone con video", () => {
    const other = loaded.themes.find((t) => t.manifest.id === "minimo")!;
    const html = renderInvitePage({ theme: other, config: sampleConfig(other.manifest), slug: "x", features: new Set(ADDON_KEYS), runtime });
    assert.doesNotMatch(html, /zone-video/);
    assert.doesNotMatch(html, /class="zone zone-/);
  });
});

describe("stili non validi", () => {
  it("la fixture viene respinta con tutti i suoi problemi", () => {
    const r = loadTheme(path.join(here, "fixtures", "stile-rotto"));
    assert.equal(r.theme, null);
    const all = r.errors.join("\n");
    assert.match(all, /fonts: URL non ammesso/);
    assert.match(all, /@import/);
    assert.match(all, /url\(\) ammesso solo/);
    assert.match(all, /demo\.cover/);
  });
});

describe("configurazione a blocchi", () => {
  it("il modello di default ha i blocchi che le sue funzioni abilitano", () => {
    const c = { ...DEFAULT_CATALOG, themes: [], music: [] } as Catalog;
    const m = getModel(c, "invitation-rsvp")!;
    const features = activeFeatures(c, m.id, []);
    assert.ok(features.has("rsvp"));
    const config = defaultConfig(loadThemes().themes[0].manifest, m.id, "wedding", features);
    assert.ok(config.blocks.some((b) => b.type === "rsvp"));
    assert.ok(config.blocks.some((b) => b.type === "countdown")); // inclusa nel modello Smart
    const base = getModel(c, "save-the-date")!;
    const baseConfig = defaultConfig(loadThemes().themes[0].manifest, base.id, "wedding", activeFeatures(c, base.id, []));
    assert.ok(!baseConfig.blocks.some((b) => b.type === "countdown")); // opzione del modello Base: non acquistata
  });
});

describe("localizzazione", () => {
  const theme = loadThemes().themes.find((t) => t.manifest.id === "invitereference")!;

  it("con locale inglese le etichette dei blocchi sono in inglese", () => {
    const config = sampleConfig(theme.manifest, "en");
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: false });
    assert.match(html, /Tap to open/);
    assert.match(html, /Scratch to reveal the date/);
    assert.doesNotMatch(html, /Tocca per aprire|Gratta per scoprire/);
    assert.match(html, /lang="en"/);
  });

  it("con locale italiano restano le etichette italiane", () => {
    const config = sampleConfig(theme.manifest);
    const html = renderInvitePage({ theme, config, slug: "x", features: new Set(ADDON_KEYS), runtime, preview: true });
    assert.match(html, /Conferma la tua presenza/);
  });
});
