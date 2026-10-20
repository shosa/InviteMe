// Test end-to-end dell'API contro un server già avviato e un PostgreSQL reale.
// Uso: BASE_URL=http://localhost:4000 ADMIN_TOKEN=... npm run smoke -w @inviteme/api
// Richiede ALLOW_LOCAL_CHECKOUT=true sul server (checkout di prova). Il video è facoltativo: SAMPLE_VIDEO=/percorso/file.mp4
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const ADMIN = process.env.ADMIN_TOKEN ?? "";
const SAMPLE_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP43+AARwzEcQDiohvxgB7+wgAAAABJRU5ErkJggg==", "base64");
let passed = 0;
let failed = 0;

const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  ok ? passed++ : failed++;
};

async function call(path, { method = "GET", body, cookie, form, admin = false, raw = false } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (admin) headers.Authorization = `Bearer ${ADMIN}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  const data = raw ? text : text ? safeJson(text) : null;
  return { status: res.status, data, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

function safeJson(t) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

const email = `smoke-${Date.now()}@example.com`;
const reg = await call("/api/auth/register", { method: "POST", body: { email, password: "password123", name: "Smoke" } });
check("registrazione", reg.status === 201, `status ${reg.status}`);
const cookie = reg.cookie;

const created = await call("/api/invitations", { method: "POST", cookie, body: { model: "invitation-rsvp", themeId: "invitereference", eventType: "wedding" } });
check("creazione invito con tema", created.status === 201 && created.data?.slug, `status ${created.status}`);
const { id, slug } = created.data ?? {};

const bad = await call("/api/invitations", { method: "POST", cookie, body: { model: "invitation-rsvp", themeId: "tema-inesistente" } });
check("tema non disponibile rifiutato", bad.status === 400, `status ${bad.status}`);

const photo = new FormData();
photo.append("file", new Blob([SAMPLE_PNG], { type: "image/png" }), "foto.png");
const up = await call(`/api/invitations/${id}/media?kind=photo`, { method: "POST", cookie, form: photo });
check("foto convertita da ffmpeg", up.status === 201 && /^\/api\/media\/.+\.jpg$/.test(up.data?.url ?? ""), `status ${up.status}`);
const photoUrl = up.data?.url;

let videoUrl = "";
if (process.env.SAMPLE_VIDEO && fs.existsSync(process.env.SAMPLE_VIDEO)) {
  const v = new FormData();
  v.append("file", new Blob([fs.readFileSync(process.env.SAMPLE_VIDEO)], { type: "video/mp4" }), "video.mp4");
  const vu = await call(`/api/invitations/${id}/media?kind=video`, { method: "POST", cookie, form: v });
  check("video convertito da ffmpeg", vu.status === 201, `status ${vu.status}`);
  videoUrl = vu.data?.url ?? "";
}

const event = {
  title: "Sara & <i>Luca</i>",
  hosts: "Con gioia",
  eventDate: "2027-02-14",
  eventTime: "16:00",
  venue: "Villa dei Glicini",
  address: "Via Roma 1, Firenze",
};
const blocks = [
  { id: "b-cover", type: "cover", props: { coverVideo: videoUrl || "" } },
  { id: "b-hero", type: "hero", props: { couplePhoto: photoUrl, occasion: "Per sempre" } },
  { id: "b-msg", type: "message", props: { heading: "Invito", body: "Una riga\nun'altra" } },
  { id: "b-gallery", type: "gallery", props: { heading: "Noi", photos: [photoUrl] } },
  { id: "b-program", type: "program", props: { heading: "Programma", items: [{ time: "16:00", label: "Cerimonia" }] } },
  { id: "b-venue", type: "venue", props: { heading: "Dove", photo: "" } },
  { id: "b-rsvp", type: "rsvp", props: { heading: "Conferma", intro: "Ti aspettiamo" } },
  { id: "b-footer", type: "footer", props: { signature: "Sara e Luca" } },
];
const put = await call(`/api/invitations/${id}`, { method: "PUT", cookie, body: { themeId: "invitereference", model: "invitation-rsvp", addons: ["program", "gallery"], event, blocks } });
check("salvataggio configurazione a blocchi", put.status === 200, `status ${put.status}`);

const blockTypes = await call(`/api/invitations/${id}/manage`, { cookie });
check("blocchi scartati se la funzione non è acquistata", !blockTypes.data?.config?.blocks?.some((b) => b.type === "countdown"), "countdown senza funzione");

const preview = await call(`/api/invitations/${id}/preview`, { method: "POST", cookie, body: { themeId: "invitereference", model: "invitation-rsvp", addons: ["program", "gallery"], event, blocks }, raw: true });
check("anteprima con HTML escapato", preview.status === 200 && preview.data.includes("Sara &amp; &lt;i&gt;Luca") && !preview.data.includes("<i>Luca"), `status ${preview.status}`);

const before = await call(`/api/public/invitations/${slug}/page`, { raw: true });
check("pagina pubblica non visibile prima del pagamento", before.status === 404, `status ${before.status}`);

const paid = await call("/api/checkout/complete", { method: "POST", cookie, body: { invitationId: id } });
check("pagamento di prova", paid.status === 200, `status ${paid.status}`);

const page = await call(`/api/public/invitations/${slug}/page`, { raw: true });
check("pagina pubblica dopo il pagamento", page.status === 200 && page.data.includes('data-cover'), `status ${page.status}`);
check("nessun segnaposto rimasto", !/\{\{\s*[#^/!]?\s*[A-Za-z_.]+\s*\}\}/.test(page.data));

const noName = await call("/api/rsvp", { method: "POST", body: { slug, answers: { attending: true } } });
check("RSVP senza campo obbligatorio rifiutato", noName.status === 400, `status ${noName.status}`);
const ok = await call("/api/rsvp", { method: "POST", body: { slug, answers: { name: "Mario", attending: true, guests: 2 }, website: "" } });
check("RSVP valido salvato", ok.status === 201, `status ${ok.status}`);
const honey = await call("/api/rsvp", { method: "POST", body: { slug, answers: { name: "Bot", attending: false }, website: "spam" } });
check("campo trappola: risposta ok ma nulla salvato", honey.status === 201);
const list = await call(`/api/invitations/${id}/rsvps`, { cookie });
check("una sola risposta registrata", list.data?.total === 1, `total ${list.data?.total}`);

if (ADMIN) {
  const cat = await call("/api/admin/catalog", { admin: true });
  check("catalogo admin con temi", Array.isArray(cat.data?.themes) && cat.data.themes.length >= 1);
  // Con un solo stile attivo la disattivazione deve essere rifiutata: non si lascia la piattaforma senza stili.
  // Disattiva lo stile di test e poi lo riattiva: il test non lascia il catalogo in uno stato rotto.
  const off = await call("/api/admin/themes/invitereference", { method: "PATCH", admin: true, body: { enabled: false } });
  check("disattivazione stile via admin", off.status === 200, `status ${off.status}`);
  const on = await call("/api/admin/themes/invitereference", { method: "PATCH", admin: true, body: { enabled: true } });
  check("riattivazione stile via admin", on.status === 200, `status ${on.status}`);
}

const planner = await call(`/api/invitations/${id}/planner`, { method: "PUT", cookie, body: { notes: "Fiorista", countdownNote: "Navetta alle 15:00" } });
check("note del pianificatore salvate", planner.status === 200 && planner.data?.planner?.countdownNote === "Navetta alle 15:00", `status ${planner.status}`);
const manageNow = await call(`/api/invitations/${id}/manage`, { cookie });
check("note del pianificatore rilette dopo il salvataggio", manageNow.data?.planner?.notes === "Fiorista");

const demo = await call("/api/themes/invitereference/demo", { raw: true });
check("pagina demo del tema", demo.status === 200 && demo.data.includes("data-rsvp-dialog"));

console.log(`\n${passed} superati, ${failed} falliti`);
process.exit(failed ? 1 : 0);
