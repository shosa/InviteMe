// Test end-to-end del flusso InviteMe contro un server già avviato.
// Uso: npm run smoke   (BASE_URL, ADMIN_TOKEN, SHOPIFY_WEBHOOK_SECRET facoltativi)
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failed = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

async function call(p, { method = "GET", body, cookie, headers = {} } = {}) {
  return fetch(BASE + p, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const sessionCookie = (res) =>
  res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("inviteme_session=")) ?? "";

const email = `test+${Date.now()}@example.com`;

// 1. Registrazione e sessione
const reg = await call("/api/auth/register", { method: "POST", body: { email, password: "password-lunga-1", name: "Anna Test" } });
const session = sessionCookie(reg);
check("registrazione crea sessione", reg.status === 201 && !!session, `status ${reg.status}`);
const badReg = await call("/api/auth/register", { method: "POST", body: { email: "x", password: "corta", name: "" } });
check("registrazione con dati non validi rifiutata (400)", badReg.status === 400);
const login = await call("/api/auth/login", { method: "POST", body: { email, password: "sbagliata-123" } });
check("login con password errata rifiutato (401)", login.status === 401);
const me = await (await call("/api/auth/me", { cookie: session })).json();
check("sessione riconosciuta", me.user?.email === email);

// 2. Creazione: senza sessione no, con sessione sì
const anon = await call("/api/invitations", { method: "POST", body: { model: "invitation-rsvp" } });
check("creazione senza accesso rifiutata (401)", anon.status === 401);
const created = await call("/api/invitations", { method: "POST", body: { model: "invitation-rsvp", eventType: "wedding", styleId: "avorio" }, cookie: session });
const { id, slug } = created.ok ? await created.json() : {};
check("crea invito dal modello con invito RSVP", created.status === 201 && !!id, `status ${created.status}`);
if (!id) {
  console.log("Impossibile continuare senza invito.");
  process.exit(1);
}
const pub0 = await (await call(`/api/invitations/${id}`)).text();
check("dati pubblici senza userId", !pub0.includes("userId"));

// 3. Modifica: solo il proprietario
const config = {
  model: "invitation-rsvp",
  styleId: "laguna",
  eventType: "wedding",
  title: "Anna & Paolo",
  hosts: "Anna e Paolo",
  eventDate: "2027-06-12",
  eventTime: "18:00",
  venue: "Villa Test",
  address: "Via Roma 1, Firenze",
  message: "Vi aspettiamo",
  photos: [],
  sections: [{ id: "s1", title: "Programma", body: "Cena" }],
  rsvpQuestions: [
    { id: "attending", label: "Parteciperai?", type: "yes-no" },
    { id: "guests", label: "Persone", type: "number" },
  ],
  addons: ["music", "map", "countdown"],
  musicUrl: "https://example.com/brano.mp3",
  locale: "it",
};
const noAuth = await call(`/api/invitations/${id}`, { method: "PUT", body: config });
check("modifica senza sessione rifiutata (403)", noAuth.status === 403, `status ${noAuth.status}`);
const put = await call(`/api/invitations/${id}`, { method: "PUT", body: config, cookie: session });
check("modifica del proprietario accettata", put.status === 200, `status ${put.status}`);

// 4. Pagina pubblica: non è visibile finché non è pagata
const beforePay = await call(`/i/${slug}`);
check("invito non pagato non pubblico (404)", beforePay.status === 404, `status ${beforePay.status}`);

// 5. Checkout e pagamento di prova (se abilitato)
const checkout = await call("/api/checkout", { method: "POST", body: { invitationId: id }, cookie: session });
if (checkout.status === 503 || checkout.status === 403) {
  check("pagamento bloccato senza Shopify e senza modalità di prova", true, `status ${checkout.status}`);
  console.log("SKIP  resto del flusso: serve modalità di prova (sviluppo o ALLOW_LOCAL_CHECKOUT=true)");
} else {
  const ck = await checkout.json();
  check("checkout avviato", checkout.status === 200 && !!ck.checkoutUrl, `status ${checkout.status}`);
  const pay = await call("/api/checkout/complete", { method: "POST", body: { invitationId: id }, cookie: session });
  check("pagamento di prova completato", pay.status === 200, `status ${pay.status}`);
  const after = await call(`/api/invitations/${id}`, { method: "PUT", body: config, cookie: session });
  check("modifica dopo pagamento bloccata (409)", after.status === 409, `status ${after.status}`);

  // 6. Pagina pubblica con add-on
  const page = await call(`/i/${slug}`);
  const html = await page.text();
  check("pagina pubblica visibile dopo il pagamento", page.status === 200);
  check("titolo e add-on nella pagina", html.includes("Anna &amp; Paolo") || html.includes("Anna & Paolo"));
  check("mappa nell'invito", html.includes("maps.google.com/maps?q="));
  check("musica nell'invito", html.includes("https://example.com/brano.mp3"));

  // 7. Invio agli ospiti (email nella outbox in sviluppo)
  const sendRes = await call(`/api/invitations/${id}/guests`, {
    method: "POST",
    body: { emails: ["ospite1@example.com", "ospite2@example.com", "non-una-mail"] },
    cookie: session,
  });
  const sent = sendRes.ok ? await sendRes.json() : {};
  check("invito inviato agli ospiti", sendRes.status === 200 && sent.sent === 2, `sent ${sent.sent}`);
  const outboxPath = path.join(process.cwd(), "data", "outbox.json");
  try {
    const outbox = JSON.parse(readFileSync(outboxPath, "utf8"));
    check("email registrata nella outbox", outbox.some((m) => m.to === "ospite1@example.com" && m.subject.includes("Invito")));
  } catch {
    check("outbox leggibile (serve accesso al filesystem del server)", false);
  }
  const guestsNoAuth = await call(`/api/invitations/${id}/guests`, { method: "POST", body: { emails: ["x@example.com"] } });
  check("invio ospiti senza sessione rifiutato (403)", guestsNoAuth.status === 403);

  // 8. Conferma di presenza e notifica al proprietario
  const rsvp = await call("/api/rsvp", { method: "POST", body: { slug, answers: { attending: true, guests: 2, intrusa: "x" } } });
  check("conferma di presenza registrata", rsvp.status === 201, `status ${rsvp.status}`);
  const list = await (await call(`/api/invitations/${id}/rsvps`, { cookie: session })).json();
  check("proprietario vede le risposte", list.total >= 1 && list.attending >= 1);
  check("risposte non configurate scartate", !JSON.stringify(list.rsvps).includes("intrusa"));
  const listAnon = await call(`/api/invitations/${id}/rsvps`);
  check("risposte non visibili senza sessione (403)", listAnon.status === 403);
  const csv = await call(`/api/invitations/${id}/rsvps?format=csv`, { cookie: session });
  check("export CSV disponibile", csv.status === 200 && (await csv.text()).includes("Parteciperai?"));
}

// 9. Modello senza RSVP non accetta conferme
const stdCreated = await call("/api/invitations", { method: "POST", body: { model: "save-the-date" }, cookie: session });
const std = await stdCreated.json();
const stdRsvp = await call("/api/rsvp", { method: "POST", body: { slug: std.slug, answers: { attending: true } } });
check("Save the Date non accetta conferme (400)", stdRsvp.status === 400, `status ${stdRsvp.status}`);

// 10. Metriche riservate all'admin
const metricsAnon = await call("/api/metrics");
if (process.env.ADMIN_TOKEN) {
  check("metriche rifiutate senza ADMIN_TOKEN (401)", metricsAnon.status === 401);
  const ok = await call("/api/metrics", { headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` } });
  check("metriche con ADMIN_TOKEN", ok.status === 200);
} else {
  check("metriche accessibili in sviluppo (nessun ADMIN_TOKEN)", metricsAnon.status === 200);
}

// 11. Webhook Shopify
const orderBody = JSON.stringify({
  id: Date.now(),
  name: "#TEST",
  total_price: "65.00",
  currency: "EUR",
  note_attributes: [{ name: "invitationId", value: id }],
});
const forged = await call("/api/webhooks/shopify", {
  method: "POST",
  body: orderBody,
  headers: { "X-Shopify-Topic": "orders/paid", "X-Shopify-Hmac-Sha256": "FIRMA-FALSA" },
});
check("webhook con firma errata rifiutato (401)", forged.status === 401, `status ${forged.status}`);
const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
if (secret) {
  const sig = crypto.createHmac("sha256", secret).update(orderBody, "utf8").digest("base64");
  const ok = await call("/api/webhooks/shopify", {
    method: "POST",
    body: orderBody,
    headers: { "X-Shopify-Topic": "orders/paid", "X-Shopify-Hmac-Sha256": sig },
  });
  check("webhook con firma valida accettato (200)", ok.status === 200, `status ${ok.status}`);
} else {
  console.log("SKIP  webhook con firma valida (SHOPIFY_WEBHOOK_SECRET non impostato)");
}

console.log(failed === 0 ? "\nTutti i test sono passati." : `\n${failed} test falliti.`);
process.exit(failed === 0 ? 0 : 1);
