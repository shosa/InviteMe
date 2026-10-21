import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { parseStockFilters, searchStock, trustedHost, StockError } from "../src/pixabay";

describe("filtri di ricerca Pixabay", () => {
  it("usa i valori predefiniti quando non si chiede altro", () => {
    const f = parseStockFilters({ q: "fiori" });
    assert.equal(f.q, "fiori");
    assert.equal(f.lang, "it");
    assert.equal(f.type, "all");
    assert.equal(f.orientation, "all");
    assert.equal(f.order, "popular");
    assert.equal(f.color, undefined);
    assert.equal(f.category, undefined);
    assert.equal(f.editorsChoice, false);
    assert.equal(f.minWidth, 0);
    assert.equal(f.page, 1);
  });

  it("accetta i filtri della documentazione: trasparenza, formato, colore, categoria", () => {
    const f = parseStockFilters({ q: "lanterna", type: "illustration", orientation: "vertical", color: "transparent", category: "backgrounds", order: "latest", editorsChoice: "true", minWidth: "1920", page: "2", lang: "en" });
    assert.equal(f.color, "transparent");
    assert.equal(f.type, "illustration");
    assert.equal(f.category, "backgrounds");
    assert.equal(f.editorsChoice, true);
    assert.equal(f.minWidth, 1920);
    assert.equal(f.page, 2);
    assert.equal(f.lang, "en");
  });

  it("un valore fuori elenco non passa all'API: torna il predefinito", () => {
    const f = parseStockFilters({ q: "fiori", color: "rosa&evil=1", category: "xyz", minWidth: "99999", type: "vector" });
    assert.equal(f.color, undefined);
    assert.equal(f.category, undefined);
    assert.equal(f.minWidth, 0);
    assert.equal(f.type, "all");
  });

  it("una ricerca troppo corta è un errore 400", () => {
    assert.throws(() => parseStockFilters({ q: " a " }), (e: unknown) => e instanceof StockError && e.status === 400);
  });
});

describe("foto da Pixabay: solo host fidati", () => {
  it("accetta https su pixabay.com e sui suoi sottodomini", () => {
    assert.equal(trustedHost("https://pixabay.com/get/g123.jpg"), true);
    assert.equal(trustedHost("https://cdn.pixabay.com/photo/x.jpg"), true);
  });

  it("rifiuta http, altri domini e domini che solo finiscono allo stesso modo", () => {
    assert.equal(trustedHost("http://pixabay.com/get/x.jpg"), false);
    assert.equal(trustedHost("https://evilpixabay.com/x.jpg"), false);
    assert.equal(trustedHost("https://pixabay.com.evil.test/x.jpg"), false);
    assert.equal(trustedHost("https://169.254.169.254/latest"), false);
    assert.equal(trustedHost("non un indirizzo"), false);
  });
});

describe("ricerca Pixabay senza chiave", () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.PIXABAY_API_KEY;
    delete process.env.PIXABAY_API_KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.PIXABAY_API_KEY;
    else process.env.PIXABAY_API_KEY = saved;
  });

  it("risponde 503 senza chiamare Pixabay", async () => {
    await assert.rejects(searchStock(parseStockFilters({ q: "fiori" })), (e: unknown) => e instanceof StockError && e.status === 503);
  });
});
