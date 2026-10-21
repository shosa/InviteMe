import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { searchStock, trustedHost, StockError } from "../src/pixabay";

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
    await assert.rejects(searchStock("fiori", 1, "it"), (e: unknown) => e instanceof StockError && e.status === 503);
  });
});
