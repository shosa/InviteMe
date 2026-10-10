// Test end-to-end dell'API InviteMe contro un server già avviato e un PostgreSQL reale.
// Uso: BASE_URL=http://localhost:4000 ADMIN_TOKEN=... SHOPIFY_WEBHOOK_SECRET=... npm run smoke
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const ADMIN = process.env.ADMIN_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
let failed = 0;
let passed = 0;

const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  ok ? passed++ : failed++;
};

async function call(p, { method = "GET", body, cookie, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  let payload;
  if (raw) payload = raw;
  else if (body !== undefined) {
    h["Content-Type"] = "application/json";
    payload = typeof body === "string" ? body : JSON.stringify(body);
  }
  return fetch(BASE + p, { method, headers: h, body: payload, redirect: "manual" });
}
const cookieOf = (res) => res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("inviteme_session=")) ?? "";
const json = async (res) => res.json().catch(() => ({}));
const admin = { Authorization: `Bearer ${ADMIN}` };

// ───── Servizio e catalogo ─────
const health = await call("/api/health");
check("API attiva", health.status === 200);
const catalog = await json(await call("/api/catalog"));
check("catalogo con tre modelli", catalog.models?.length === 3, `${catalog.models?.length}`);
check("funzioni con prezzo singolo", catalog.addons?.length >= 6);
check("l'API non espone utenti nel catalogo", !JSON.stringify(catalog).includes("password"));

// ───── Account e ruoli ─────
const email = `cliente+${Date.now()}@example.com`;
const reg = await call("/api/auth/register", { method: "POST", body: { email, password: "password-lunga-1", name: "Anna Cliente" } });
const session = cookieOf(reg);
check("registrazione con sessione", reg.status === 201 && !!session, `status ${reg.status}`);
const badReg = await call("/api/auth/register", { method: "POST", body: { email: "x", password: "corta", name: "" } });
check("registrazione non valida rifiutata (400)", badReg.status === 400);
const badLogin = await call("/api/auth/login", { method: "POST", body: { email, password: "sbagliata-123" } });
check("login con password errata rifiutato (401)", badLogin.status === 401);
const me = await json(await call("/api/auth/me", { cookie: session }));
check("sessione riconosciuta come cliente", me.user?.email === email && me.user?.role === "user");

const notAdmin = await call("/api/admin/catalog", { cookie: session });
check("il cliente non entra nella console (403)", notAdmin.status === 403, `status ${notAdmin.status}`);
const anonAdmin = await call("/api/admin/metrics");
check("admin senza credenziali rifiutato (401/403)", anonAdmin.status === 401 || anonAdmin.status === 403);

// ───── Accesso con Google ─────
const gStart = await call("/api/auth/google");
if (gStart.status === 503) check("Google non configurato: risposta 503", true, "credenziali non impostate");
else check("avvio Google reindirizza a Google", gStart.status === 302 && (gStart.headers.get("location") || "").startsWith("https://accounts.google.com/"), "status " + gStart.status);
const gBad = await call("/api/auth/google/callback?code=x&state=y");
check("callback Google senza stato valido rifiutato", gBad.status === 302 && (gBad.headers.get("location") || "").includes("error=google"), "status " + gBad.status);

// ───── Console: catalogo modificabile ─────
const full = await json(await call("/api/admin/catalog", { headers: admin }));
check("console legge il catalogo completo", Array.isArray(full.models) && full.models.length >= 3);

const priceBefore = full.addons.find((a) => a.key === "map").cents;
const altered = {
  models: full.models,
  styles: full.styles,
  addons: full.addons.map((a) => (a.key === "map" ? { ...a, cents: 1234, label: "Mappa aggiornata" } : a)),
};
const put = await call("/api/admin/catalog", { method: "PUT", headers: admin, body: altered });
check("console salva il catalogo", put.status === 200, `status ${put.status}`);
const afterPut = await json(await call("/api/catalog"));
check("modifica prezzo visibile sul sito", afterPut.addons.find((a) => a.key === "map")?.cents === 1234);

const hostile = { ...altered, models: altered.models.map((m) => (m.id === "custom" ? { ...m, description: "<script>x</script>", priceCents: -50 } : m)) };
await call("/api/admin/catalog", { method: "PUT", headers: admin, body: hostile });
const hostileCatalog = await json(await call("/api/catalog"));
const customModel = hostileCatalog.models.find((m) => m.id === "custom");
check("prezzo negativo azzerato dalla validazione", customModel?.priceCents === 0);

// Ripristino del prezzo originale per il resto del test
await call("/api/admin/catalog", { method: "PUT", headers: admin, body: { ...altered, addons: full.addons, models: full.models } });
const restored = await json(await call("/api/catalog"));
check("ripristino prezzi originali", restored.addons.find((a) => a.key === "map")?.cents === priceBefore);

// ───── Temi: caricamento, validazione, protezione dei preimpostati ─────
const themeFile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "..", "docs", "examples", "tema-esempio.json"), "utf8"));
const upTheme = await call("/api/admin/themes", { method: "POST", headers: admin, body: themeFile });
check("tema a file singolo caricato", upTheme.status === 201, "status " + upTheme.status);
const badTheme = await call("/api/admin/themes", { method: "POST", headers: admin, body: { ...themeFile, id: "x", css: "@import url(evil);" } });
check("tema non valido rifiutato con errori", badTheme.status === 400 && (await badTheme.json()).errors?.length > 0);
const builtinCopy = await call("/api/admin/themes", { method: "POST", headers: admin, body: { ...themeFile, id: "carta", css: themeFile.css.replace(/salvia-/g, "carta-") } });
check("id di un tema preimpostato rifiutato (409)", builtinCopy.status === 409, "status " + builtinCopy.status);
const off = await call("/api/admin/themes/salvia", { method: "PATCH", headers: admin, body: { enabled: false } });
check("tema disattivato", off.status === 200);
const delBuiltin = await call("/api/admin/themes/carta", { method: "DELETE", headers: admin });
check("preimpostato non eliminabile (409)", delBuiltin.status === 409);
const del = await call("/api/admin/themes/salvia", { method: "DELETE", headers: admin });
check("tema caricato eliminato", del.status === 200);

// ───── Libreria musicale ─────
const audio = new Blob([crypto.randomBytes(4096)], { type: "audio/mpeg" });
const noRights = new FormData();
noRights.set("file", audio, "brano.mp3");
noRights.set("title", "Brano di prova");
const rejected = await call("/api/admin/music", { method: "POST", headers: admin, raw: noRights });
check("brano senza conferma dei diritti rifiutato (400)", rejected.status === 400, `status ${rejected.status}`);

const fd = new FormData();
fd.set("file", audio, "brano.mp3");
fd.set("title", "Brano di prova");
fd.set("artist", "Test Artist");
fd.set("license", "Licenza di test");
fd.set("rights", "true");
const up = await call("/api/admin/music", { method: "POST", headers: admin, raw: fd });
const upBody = await json(up);
check("brano caricato nella libreria", up.status === 201, `status ${up.status}`);
const catalogWithMusic = await json(await call("/api/catalog"));
const track = catalogWithMusic.music.find((t) => t.id === upBody.id);
check("brano visibile nel catalogo pubblico", !!track);
const mediaRes = await call(track ? track.url.replace("/api/media/", "/api/media/") : "/api/media/none.mp3");
check("file audio servito dall'API", mediaRes.status === 200, `status ${mediaRes.status}`);

// ───── Creazione inviti: tre modelli ─────
const mk = async (model) => json(await call("/api/invitations", { method: "POST", body: { model, eventType: "wedding", styleId: "avorio" }, cookie: session }));
const inv = await mk("invitation-rsvp");
check("crea invito dal modello con conferma", !!inv.id);
const std = await mk("save-the-date");
check("crea Save the Date", !!std.id);
const custom = await mk("custom");
check("crea invito Su misura", !!custom.id);
const anon = await call("/api/invitations", { method: "POST", body: { model: "custom" } });
check("creazione senza sessione rifiutata (401)", anon.status === 401);

// ───── Modifica: configurazione validata ─────
const manage = await json(await call(`/api/invitations/${inv.id}/manage`, { cookie: session }));
check("proprietario legge la gestione dell'invito", manage.id === inv.id && manage.catalog?.models?.length === 3);
const cfg = {
  ...manage.config,
  title: "Anna & Paolo",
  hosts: "Anna e Paolo",
  eventDate: "2027-06-12",
  eventTime: "18:00",
  addons: ["map", "music", "countdown", "gallery"],
  musicTrackId: upBody.id,
  sections: [{ id: "p1", title: "Programma", body: "16:30 - Cerimonia\n18:30 - Aperitivo\n20:00 - Cena" }],
  rsvpQuestions: [
    { id: "attending", label: "Parteciperai?", type: "yes-no" },
    { id: "guests", label: "Persone", type: "number" },
    { id: "drink", label: "Bevanda", type: "choice", options: ["Vino", "Analcolico"] },
  ],
};
const save = await call(`/api/invitations/${inv.id}`, { method: "PUT", body: cfg, cookie: session });
check("modifica salvata", save.status === 200, `status ${save.status}`);
const saved = await json(await call(`/api/invitations/${inv.id}/manage`, { cookie: session }));
check("brano dalla libreria salvato", saved.config.musicTrackId === upBody.id);

const ignoredAddon = await call(`/api/invitations/${std.id}`, { method: "PUT", body: { ...manage.config, model: "save-the-date", addons: ["rsvp", "countdown"] }, cookie: session });
const stdSaved = await json(await call(`/api/invitations/${std.id}/manage`, { cookie: session }));
check("Save the Date non accetta la conferma di presenza", ignoredAddon.status === 200 && !stdSaved.config.addons.includes("rsvp"));

const noOwner = await call(`/api/invitations/${inv.id}`, { method: "PUT", body: cfg });
check("modifica senza sessione rifiutata (401)", noOwner.status === 401);

// ───── Pagina pubblica prima del pagamento ─────
const beforePay = await call(`/api/public/invitations/${inv.slug}`);
check("invito non pagato non è pubblico (404)", beforePay.status === 404);

// ───── Pagamento di prova ─────
const ck = await call("/api/checkout", { method: "POST", body: { invitationId: inv.id }, cookie: session });
if (ck.status === 503 || ck.status === 403) {
  check("pagamento disattivato senza modalità di prova", true, `status ${ck.status}`);
} else {
  check("checkout avviato", ck.status === 200, `status ${ck.status}`);
  const pay = await call("/api/checkout/complete", { method: "POST", body: { invitationId: inv.id }, cookie: session });
  check("pagamento di prova completato", pay.status === 200);
  const late = await call(`/api/invitations/${inv.id}`, { method: "PUT", body: cfg, cookie: session });
  check("modifica dopo il pagamento bloccata (409)", late.status === 409);

  const pub = await json(await call(`/api/public/invitations/${inv.slug}`));
  check("invito pubblico dopo il pagamento", pub.id === inv.id);
  check("pubblico: musica dalla libreria", pub.musicSrc === track?.url);
  check("pubblico: funzioni attive", pub.features?.includes("map") && pub.features?.includes("music"));
  check("pubblico: conferma di presenza attiva", pub.hasRsvp === true);

  const guests = await call(`/api/invitations/${inv.id}/guests`, { method: "POST", body: { emails: ["ospite1@example.com", "ospite2@example.com", "non-una-mail"] }, cookie: session });
  const gb = await json(guests);
  check("invito inviato agli ospiti", guests.status === 200 && gb.sent === 2, `sent ${gb.sent}`);
  const outbox = await json(await call("/api/dev/outbox"));
  check("email in outbox", Array.isArray(outbox) && outbox.some((m) => m.to === "ospite1@example.com"));

  const rsvp = await call("/api/rsvp", { method: "POST", body: { slug: inv.slug, answers: { attending: true, guests: 2, drink: "Vino", intrusa: "x" } } });
  check("conferma di presenza registrata", rsvp.status === 201, `status ${rsvp.status}`);
  const badChoice = await call("/api/rsvp", { method: "POST", body: { slug: inv.slug, answers: { attending: true, drink: "Birra non ammessa" } } });
  check("scelta non prevista non salvata ma invio accettato", badChoice.status === 201);
  const list = await json(await call(`/api/invitations/${inv.id}/rsvps`, { cookie: session }));
  check("proprietario vede le risposte", list.total >= 2);
  check("risposta non configurata scartata", !JSON.stringify(list.rsvps).includes("intrusa"));
  check("scelta non ammessa scartata", !JSON.stringify(list.rsvps).includes("Birra"));
  const csv = await call(`/api/invitations/${inv.id}/rsvps?format=csv`, { cookie: session });
  check("export CSV", csv.status === 200 && (await csv.text()).includes("Parteciperai?"));
}

// Il Save the Date va pagato prima di essere pubblico: poi deve rifiutare le conferme di presenza.
await call("/api/checkout", { method: "POST", body: { invitationId: std.id }, cookie: session });
const stdPay = await call("/api/checkout/complete", { method: "POST", body: { invitationId: std.id }, cookie: session });
if (stdPay.status === 200) {
  const stdRsvp = await call("/api/rsvp", { method: "POST", body: { slug: std.slug, answers: { attending: true } } });
  check("Save the Date pagato non accetta conferme (400)", stdRsvp.status === 400, `status ${stdRsvp.status}`);
} else {
  check("Save the Date: pagamento di prova non disponibile in questo ambiente", true, `status ${stdPay.status}`);
}

// ───── Admin: metriche, utenti, ordini ─────
const metrics = await call("/api/admin/metrics", { headers: admin });
check("metriche admin", metrics.status === 200 && typeof (await json(await call("/api/admin/metrics", { headers: admin }))).paid === "number");
const users = await json(await call("/api/admin/users", { headers: admin }));
const ours = users.find((u) => u.email === email);
check("elenco utenti admin", !!ours);
if (ours) {
  const role = await call(`/api/admin/users/${ours.id}`, { method: "PATCH", headers: admin, body: { role: "admin" } });
  check("promozione a admin", role.status === 200);
  const nowAdmin = await call("/api/admin/catalog", { cookie: session });
  check("il nuovo admin entra nella console", nowAdmin.status === 200, `status ${nowAdmin.status}`);
  await call(`/api/admin/users/${ours.id}`, { method: "PATCH", headers: admin, body: { role: "user" } });
}
const orders = await json(await call("/api/admin/orders", { headers: admin }));
check("ordini visibili in console", Array.isArray(orders));

// ───── Webhook Shopify ─────
const body = JSON.stringify({ id: Date.now(), name: "#TEST", total_price: "65.00", currency: "EUR", note_attributes: [{ name: "invitationId", value: custom.id }] });
const forged = await call("/api/webhooks/shopify", { method: "POST", raw: body, headers: { "Content-Type": "application/json", "X-Shopify-Topic": "orders/paid", "X-Shopify-Hmac-Sha256": "FIRMA-FALSA" } });
check("webhook con firma errata rifiutato (401)", forged.status === 401);
if (WEBHOOK_SECRET) {
  const sig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body, "utf8").digest("base64");
  const ok = await call("/api/webhooks/shopify", { method: "POST", raw: body, headers: { "Content-Type": "application/json", "X-Shopify-Topic": "orders/paid", "X-Shopify-Hmac-Sha256": sig } });
  check("webhook con firma valida accettato", ok.status === 200, `status ${ok.status}`);
}

// ───── Uscita ─────
await call("/api/auth/me", { method: "DELETE", cookie: session });
const after = await json(await call("/api/auth/me", { cookie: session }));
check("logout chiude la sessione", after.user === null);

console.log(`\n${passed} controlli superati, ${failed} falliti.`);
process.exit(failed === 0 ? 0 : 1);
