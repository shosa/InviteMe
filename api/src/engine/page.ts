import {
  ADDON_KEYS,
  blockDef,
  escapeHtml,
  renderTemplate,
  type AddonKey,
  type BlockType,
  type InviteConfig,
  type RsvpQuestion,
  type TemplateNode,
  type ThemeManifest,
} from "@inviteme/shared";
import { blockPartials } from "./blocks";
import { labelsFor } from "./i18n";

// Renderer della pagina invito: i blocchi visibili, nell'ordine scelto, più lo stile del tema.
// Ogni blocco è un template (engine/blocks/<tipo>.html) riempito con i dati dell'evento e con le proprie proprietà.
// Il template del blocco è fidato; i valori dei clienti passano sempre da escapeHtml (o dai filtri lines/url).

export type StyleFiles = {
  dir: string;
  manifest: ThemeManifest;
  css: string;
  // Markup proprio dello stile per alcuni blocchi (themes/<id>/blocks/<tipo>.html). Senza, vale il blocco standard.
  blocks?: Map<BlockType, TemplateNode[]>;
};

export type PageInput = {
  theme: StyleFiles;
  config: InviteConfig;
  slug: string;
  features: ReadonlySet<AddonKey>;
  runtime: string;
  preview?: boolean; // anteprima e demo: niente busta, il contenuto è subito visibile
  builder?: boolean; // anteprima del builder: ogni blocco ha un contenitore con il suo id, per evidenziarlo e selezionarlo
  missing?: Set<string>; // validazione: segnaposto che non trovano un dato
};

const MONTHS = {
  it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const WEEKDAYS = {
  it: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

// Riferimenti "assets/…" nel CSS e nei template dei blocchi: il motore li porta sul percorso pubblico dello stile.
export function themeAssetsBase(themeId: string): string {
  return `/api/themes/${themeId}/assets`;
}

export function renderInvitePage(input: PageInput): string {
  const { theme, config, slug, features, runtime } = input;
  const m = theme.manifest;
  const base = themeAssetsBase(m.id);
  const partials = new Map([...blockPartials().partials, ...(theme.blocks ?? [])]);

  const globals = pageGlobals(input);
  let cover = "";
  let main = "";
  for (const block of config.blocks) {
    if (block.hidden || !blockDef(block.type)) continue;
    const template = partials.get(block.type as BlockType);
    if (!template) continue;
    const html = renderTemplate(template, { ...globals, ...listFlags(block.props), ...block.props }, { missing: input.missing });
    const look = block.type === "cover" ? html : lookWrap(block.props, html);
    // display:contents: il contenitore non cambia l'impaginazione; serve solo a sapere a quale blocco appartiene ciò che c'è dentro.
    const framed = input.builder ? `<div data-blk="${escapeHtml(block.id)}" style="display:contents">${look}</div>` : look;
    if (block.type === "cover") cover += framed;
    else main += framed;
  }
  const body = `${cover}<main class="invite">\n${main}</main>`;

  const css = theme.css.replace(/url\((["']?)assets\//g, `url($1${base}/`) + LOOK_CSS;
  const html = body.replace(/(src|poster|srcset|href)=(["'])assets\//g, `$1=$2${base}/`);

  const title = String(config.event.title ?? "");
  const description = String(config.event.hosts ?? "") || title;
  const fonts = m.fonts.map((f) => `<link rel="stylesheet" href="${escapeHtml(f)}">`).join("\n");
  const payload = JSON.stringify({ slug, locale: config.locale, title, rsvp: globals.rsvp }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="${config.locale}" data-theme="${escapeHtml(m.id)}" data-assets="${base}"${input.preview ? " data-preview" : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="data:,">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description.slice(0, 160))}">
<meta name="theme-color" content="${escapeHtml(m.themeColor)}">
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n${fonts}` : ""}
<style>
${css}
</style>
</head>
<body class="theme-${escapeHtml(m.id)}">
${html}
<script type="application/json" id="inv-data">${payload}</script>
<script>
${runtime}
</script>
${input.builder ? `<script>\n${BUILDER_JS}\n</script>\n` : ""}</body>
</html>
`;
}

// Dati comuni a tutti i blocchi: evento, date, funzioni, domande di conferma, tema.
function pageGlobals(input: PageInput): Record<string, unknown> {
  const { theme, config, slug, features } = input;
  const m = theme.manifest;
  const rsvp = features.has("rsvp") && config.blocks.some((b) => b.type === "rsvp" && !b.hidden);
  return {
    ...config.event,
    features: Object.fromEntries(ADDON_KEYS.map((k) => [k, features.has(k)])),
    rsvp,
    rsvpQuestions: config.rsvpQuestions.map(questionView),
    date: dateView(String(config.event.eventDate ?? ""), config.locale),
    monogram: monogram(String(config.event.title ?? "")),
    theme: { id: m.id, name: m.name, description: m.description, themeColor: m.themeColor },
    slug,
    locale: config.locale,
    t: labelsFor(config.locale),
    preview: !!input.preview,
  };
}

// Solo nell'anteprima del builder: evidenzia il blocco sotto il mouse (o quello scelto nella lista) e lo segnala al builder.
// Messaggi: dal builder {type:"highlight", id}; dall'anteprima {type:"hover", id} e {type:"select", id}.
const BUILDER_JS = `(function () {
  var box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;pointer-events:none;display:none;z-index:2147483000;border:2px solid #d9822b;border-radius:6px;background:rgba(217,130,43,.06)';
  document.body.appendChild(box);
  var current = null;
  function owner(el) { return el && el.closest ? el.closest('[data-blk]') : null; }
  function bounds(wrap) {
    var r = null;
    for (var i = 0; i < wrap.children.length; i++) {
      var b = wrap.children[i].getBoundingClientRect();
      if (!b.width && !b.height) continue;
      if (!r) r = { l: b.left, t: b.top, r: b.right, b: b.bottom };
      else { r.l = Math.min(r.l, b.left); r.t = Math.min(r.t, b.top); r.r = Math.max(r.r, b.right); r.b = Math.max(r.b, b.bottom); }
    }
    return r;
  }
  function paint() {
    var wrap = current && document.querySelector('[data-blk="' + current + '"]');
    var r = wrap && bounds(wrap);
    if (!r) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.style.left = (r.l - 4) + 'px';
    box.style.top = (r.t - 4) + 'px';
    box.style.width = (r.r - r.l + 8) + 'px';
    box.style.height = (r.b - r.t + 8) + 'px';
  }
  function setCurrent(id, notify) {
    if (id === current) return;
    current = id;
    paint();
    if (notify) parent.postMessage({ type: 'hover', id: id }, '*');
  }
  document.addEventListener('mousemove', function (e) {
    var w = owner(e.target);
    setCurrent(w ? w.getAttribute('data-blk') : null, true);
  });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) setCurrent(null, true); });
  document.addEventListener('click', function (e) {
    var w = owner(e.target);
    if (w) parent.postMessage({ type: 'select', id: w.getAttribute('data-blk') }, '*');
  }, true);
  window.addEventListener('scroll', paint, { passive: true });
  window.addEventListener('resize', paint);
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (d && d.type === 'highlight') { current = d.id || null; paint(); }
  });
})();`;

// Aspetto scelto dal cliente per un blocco (sfondo, testo, forma e copertura del gratta). Senza scelte il blocco non viene toccato.
// I valori sono già validati (esadecimali e opzioni note), quindi possono stare in uno stile inline.
function lookWrap(props: Record<string, unknown>, html: string): string {
  const vars: string[] = [];
  if (typeof props.lookBg === "string" && props.lookBg) vars.push(`--bk-bg:${props.lookBg}`);
  if (typeof props.lookInk === "string" && props.lookInk) vars.push(`--bk-ink:${props.lookInk}`);
  if (typeof props.lookCover === "string" && props.lookCover) vars.push(`--bk-cover:${props.lookCover}`);
  const shape = typeof props.lookShape === "string" ? props.lookShape : "";
  if (!vars.length && !shape) return html;
  return `<div class="bk"${shape ? ` data-shape="${shape}"` : ""} style="${vars.join(";")}">\n${html}</div>\n`;
}

// Regole comuni a tutti i temi per l'aspetto dei blocchi. Vincono sul tema solo dove il cliente ha scelto qualcosa.
const LOOK_CSS = `
.bk{background:var(--bk-bg,transparent)}
.bk[style*="--bk-ink"] :is(h1,h2,h3,h4,p,span,li,div,label,a,button){color:var(--bk-ink)!important}
.bk [data-scratch]{position:relative;overflow:hidden}
.bk [data-scratch] canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit}
.bk[data-shape="square"] [data-scratch]{border-radius:0!important}
.bk[data-shape="round"] [data-scratch]{border-radius:50%!important}
.bk[data-shape="pill"] [data-scratch]{border-radius:999px!important}
`;

// Per ogni lista del blocco, un flag "has<Nome>" vero se ha almeno una voce: la sezione si mostra una volta sola.
function listFlags(props: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (Array.isArray(v)) out[`has${k.charAt(0).toUpperCase()}${k.slice(1)}`] = v.length > 0;
  }
  return out;
}

// Monogramma dalle iniziali del titolo: "Sara & Luca" → "S·L".
export function monogram(title: string): string {
  const words = title.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((w) => w && !["e", "and", "the", "il", "la"].includes(w.toLowerCase()));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("·") || "IM";
}

// Vista di una domanda per il template: flag per tipo, così il template sceglie l'input giusto con una sezione.
function questionView(q: RsvpQuestion) {
  return {
    qid: q.id,
    label: q.label,
    type: q.type,
    requiredAttr: q.required ? "true" : "false",
    required: !!q.required,
    isYesNo: q.type === "yes-no",
    isText: q.type === "text",
    isNumber: q.type === "number",
    isChoice: q.type === "choice",
    yes: q.yes ?? "Sì",
    no: q.no ?? "No",
    options: (q.options ?? []).map((o, i) => ({ value: o, label: o, optionId: `${q.id}-${i}` })),
  };
}

function dateView(iso: string, locale: "it" | "en") {
  const d = new Date(`${iso}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(d.getTime())) {
    return { day: "", month: "", year: "", weekday: "", long: "", iso: "" };
  }
  const day = String(d.getDate());
  const month = MONTHS[locale][d.getMonth()];
  const year = String(d.getFullYear());
  const weekday = WEEKDAYS[locale][d.getDay()];
  return { day, month, year, weekday, long: `${day} ${month} ${year}`, iso };
}
