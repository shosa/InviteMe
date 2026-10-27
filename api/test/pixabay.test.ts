import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { parseStockFilters, searchStock, setRetryDelaysForTests, trustedHost, StockError } from "../src/pixabay";

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

describe("cache e limiti Pixabay", () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.PIXABAY_API_KEY;
  let calls = 0;

  beforeEach(() => {
    process.env.PIXABAY_API_KEY = "chiave-di-prova";
    setRetryDelaysForTests([0, 0]);
    calls = 0;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.PIXABAY_API_KEY;
    else process.env.PIXABAY_API_KEY = realKey;
    setRetryDelaysForTests([1000, 3000]);
  });

  it("la stessa ricerca entro 24 ore non chiama Pixabay due volte", async () => {
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ hits: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const f = parseStockFilters({ q: "cache-una-volta" });
    await searchStock(f);
    await searchStock(f);
    assert.equal(calls, 1);
  });

  it("sui 429 riprova e poi dice che Pixabay è saturo", async () => {
    globalThis.fetch = (async () => {
      calls++;
      return new Response("Rate limit exceeded", { status: 429 });
    }) as typeof fetch;
    await assert.rejects(searchStock(parseStockFilters({ q: "limite-saturo" })), (e: unknown) => e instanceof StockError && e.status === 429);
    assert.equal(calls, 3);
  });
});
