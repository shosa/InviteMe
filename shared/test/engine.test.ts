import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTemplate, renderTemplate, sanitizeValues, emptyValue, type FieldDef } from "../src/index";

describe("template", () => {
  it("escapa ogni valore", () => {
    const out = renderTemplate(parseTemplate("<p>{{x}}</p>"), { x: `<img src=x onerror="a">&'` });
    assert.equal(out, "<p>&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;</p>");
  });

  it("ripete le sezioni per gli elementi di un array e risolve i campi dell'elemento", () => {
    const out = renderTemplate(parseTemplate("{{#items}}[{{label}}|{{title}}]{{/items}}"), {
      title: "T",
      items: [{ label: "a" }, { label: "b", title: "B" }],
    });
    assert.equal(out, "[a|T][b|B]");
  });

  it("le sezioni invertite compaiono solo con valore vuoto", () => {
    const t = parseTemplate("{{^x}}vuoto{{/x}}{{#x}}pieno{{/x}}");
    assert.equal(renderTemplate(t, { x: "" }), "vuoto");
    assert.equal(renderTemplate(t, { x: "ciao" }), "pieno");
    assert.equal(renderTemplate(t, { x: [] }), "vuoto");
  });

  it("filtri lines e url", () => {
    assert.equal(renderTemplate(parseTemplate("{{m | lines}}"), { m: "a\nb" }), "a<br>b");
    assert.equal(renderTemplate(parseTemplate("{{m | url}}"), { m: "Via & Piazza 1" }), "Via%20%26%20Piazza%201");
  });

  it("rifiuta sezioni non chiuse, chiusure sbagliate e filtri sconosciuti", () => {
    assert.throws(() => parseTemplate("{{#a}}x"), /non chiusa/);
    assert.throws(() => parseTemplate("{{#a}}x{{/b}}"), /senza apertura/);
    assert.throws(() => parseTemplate("{{a | upper}}"), /Filtro non ammesso/);
  });

  it("segnala i percorsi senza dato", () => {
    const missing = new Set<string>();
    renderTemplate(parseTemplate("{{presente}}{{manca}}"), { presente: "ok" }, { missing });
    assert.deepEqual([...missing], ["manca"]);
  });

  it("non legge proprietà ereditate dal prototipo", () => {
    const missing = new Set<string>();
    const out = renderTemplate(parseTemplate("{{constructor}}"), {}, { missing });
    assert.equal(out, "");
    assert.deepEqual([...missing], ["constructor"]);
  });
});

describe("valori dei campi", () => {
  const fields: FieldDef[] = [
    { key: "title", label: "t", type: "text", group: "g", max: 10 },
    { key: "music", label: "m", type: "audio", group: "g", feature: "music" },
    { key: "photo", label: "p", type: "photo", group: "g" },
    { key: "program", label: "p", type: "list", group: "g", item: [{ key: "time", label: "o", type: "text", group: "v" }] },
  ];

  it("accetta solo URL di media prodotti dalla pipeline", () => {
    const ok = "/api/media/00000000-0000-4000-8000-000000000000.jpg";
    const v = sanitizeValues(fields, { photo: ok, title: "x" }, new Set(["music"]));
    assert.equal(v.photo, ok);
    const bad = sanitizeValues(fields, { photo: "https://evil.example/x.jpg" }, new Set(["music"]));
    assert.equal(bad.photo, "");
    const wrongExt = sanitizeValues(fields, { photo: "/api/media/00000000-0000-4000-8000-000000000000.mp3" }, new Set(["music"]));
    assert.equal(wrongExt.photo, "");
  });

  it("i campi di una funzione non acquistata restano vuoti", () => {
    const musicUrl = "/api/media/00000000-0000-4000-8000-000000000000.mp3";
    assert.equal(sanitizeValues(fields, { music: musicUrl }, new Set()).music, "");
    assert.equal(sanitizeValues(fields, { music: musicUrl }, new Set(["music"])).music, musicUrl);
  });

  it("tronca i testi al massimo e riduce gli spazi nei campi a riga singola", () => {
    assert.equal(sanitizeValues(fields, { title: "a\n\nb  c d e f g h i j k" }, new Set()).title, "a b c d e");
  });

  it("le liste tengono solo i campi dichiarati", () => {
    const v = sanitizeValues(fields, { program: [{ time: "16:00", extra: "<script>" }, "nope"] }, new Set());
    assert.deepEqual(v.program, [{ time: "16:00" }]);
  });

  it("valore vuoto coerente con il tipo", () => {
    assert.deepEqual(emptyValue({ key: "p", label: "", type: "list", group: "" }), []);
    assert.equal(emptyValue({ key: "p", label: "", type: "photo", group: "" }), "");
  });
});

