import { Nav } from "@/components/Nav";
import { getLang } from "@/lib/i18n";
import { ui } from "@/lib/ui";
import { Models } from "@/components/Models";
import { type Catalog, formatPrice } from "@inviteme/shared";
import { apiPublic } from "@/lib/api";
import { themeCopy } from "@/lib/catalogCopy";
import { Typing } from "@/components/Typing";

export const dynamic = "force-dynamic";

// Frasi del titolo dell'hero: si scrivono lettera per lettera, poi si cancellano e passano alla successiva.
const HERO_PHRASES = ["Il vostro invito, pronto in un pomeriggio.", "Una data, un link, tutti gli ospiti.", "Sapete chi viene prima del giorno.", "Si paga una volta, senza abbonamenti."];
const HERO_PHRASES_EN = ["Your invitation, ready in an afternoon.", "One date, one link, every guest.", "Know who is coming before the day.", "Pay once, no subscriptions."];

// Home "Atelier": hero con l'invito di anteprima, nastro dei modelli, tre passi, scelta del modello, domande, chiusura.
const COPY = {
  it: {
    eyebrow: "Inviti digitali · matrimoni · feste · lauree · eventi aziendali",
    titleA: "Un invito vero,",
    titleB: "in un link solo.",
    lede: "Scegli un modello, mettici i vostri nomi, le vostre foto e la vostra musica. Gli ospiti aprono la busta dal telefono e confermano da lì. Si paga una volta, non per ospite.",
    cta: "Scegli un modello",
    trial: "Apri un invito di prova →",
    statModels: "modelli",
    statPay: "pagamento unico",
    statGuests: "ospiti per link",
    stepsEyebrow: "Come funziona",
    stepsTitle: "Tre passi, in ordine. Nessuno è facoltativo.",
    steps: [
      ["Scegli il modello", "Ogni modello ha la sua carta, la sua scrittura e la sua sequenza di sezioni, per matrimoni, compleanni, baby shower, lauree e serate aziendali."],
      ["Personalizza e guarda", "Nomi, data, luogo, foto, musica, domande per gli ospiti. L'anteprima sta accanto ai controlli: quello che vedi è esattamente quello che riceveranno."],
      ["Manda un link", "WhatsApp, email, codice QR. Un solo link per tutti gli ospiti. Le risposte arrivano nella tua area e si esportano quando vuoi."],
    ],
    choose: "Scegli il modello",
    closing: "Pagamento unico, senza abbonamenti. I dati degli ospiti si esportano e si eliminano quando vuoi.",
    faq: "Domande",
    footerLine: "Nessun costo per ospite",
  },
  en: {
    eyebrow: "Digital invitations · weddings · parties · graduations · corporate events",
    titleA: "A real invitation,",
    titleB: "in a single link.",
    lede: "Pick a template, add your names, your photos and your music. Guests open the envelope on their phone and confirm from there. You pay once, not per guest.",
    cta: "Choose a template",
    trial: "Open a sample invitation →",
    statModels: "templates",
    statPay: "one-time payment",
    statGuests: "guests per link",
    stepsEyebrow: "How it works",
    stepsTitle: "Three steps, in order. None is optional.",
    steps: [
      ["Choose the template", "Each template has its own paper, its own lettering and its own sequence of sections, for weddings, birthdays, baby showers, graduations and corporate evenings."],
      ["Personalise and preview", "Names, date, place, photos, music, questions for guests. The preview sits next to the controls: what you see is exactly what they will receive."],
      ["Send a link", "WhatsApp, email, QR code. One link for all guests. Replies arrive in your area and you can export them whenever you like."],
    ],
    choose: "Choose a template",
    closing: "One payment, no subscriptions. Guest data can be exported and deleted whenever you like.",
    faq: "Questions",
    footerLine: "No cost per guest",
  },
} as const;

export default async function Home() {
  const lang = await getLang();
  const t = ui(lang);
  const c = COPY[lang];
  const catalog = (await apiPublic<Catalog>("/api/catalog")) ?? { models: [], addons: [], themes: [], music: [] };
  const themes = catalog.themes.filter((x) => x.enabled).map((x) => x.manifest);
  const models = catalog.models.filter((m) => m.enabled);
  const fromCents = models.length ? Math.min(...models.map((m) => m.priceCents)) : 0;
  const ribbon = [...themes, ...themes].map((m, i) => ({ key: `${m.id}-${i}`, name: themeCopy(m.id, m.name, lang) }));

  return (
    <>
      <Nav current="home" lang={lang} />
      <main className="atl">
        <section className="atl-hero">
          <div className="wrap atl-hero-grid">
            <div className="atl-copy">
              <p className="atl-eyebrow">{c.eyebrow}</p>
              <h1 className="atl-title"><Typing phrases={lang === "en" ? HERO_PHRASES_EN : HERO_PHRASES} /></h1>
              <p className="atl-lede">{c.lede}</p>
              <div className="atl-cta">
                <a className="atl-btn" href="#modelli">{c.cta}</a>
                <a className="atl-link" href={`/api/themes/${themes[0]?.id ?? "minimo"}/anteprima?lang=${lang}`} target="_blank" rel="noopener noreferrer">{c.trial}</a>
              </div>
              <dl className="atl-stats">
                <div><dt>{themes.length}</dt><dd>{c.statModels}</dd></div>
                <div><dt>{fromCents ? `da ${formatPrice(fromCents, lang === "en" ? "en-GB" : "it-IT")}` : "—"}</dt><dd>{c.statPay}</dd></div>
                <div><dt>{lang === "en" ? "unlimited" : "illimitati"}</dt><dd>{c.statGuests}</dd></div>
              </dl>
            </div>

            <div className="atl-visual" aria-hidden="true">
              <div className="atl-env" />
              <div className="atl-card">
                <span className="atl-mono">S·L</span>
                <p className="atl-kicker">{lang === "en" ? "We're getting married" : "Ci sposiamo"}</p>
                <p className="atl-names">Sara<br />&amp; Luca</p>
                <span className="atl-rule" />
                <p className="atl-date">12 · 06 · 2027</p>
                <p className="atl-place">Villa Carlotta, Tremezzina</p>
                <span className="atl-pill">{lang === "en" ? "Confirm attendance" : "Conferma la presenza"}</span>
              </div>
              <div className="atl-date-tag"><b>12</b><span>{lang === "en" ? "June" : "giugno"}</span><span>2027</span></div>
            </div>
          </div>
        </section>

        <div className="atl-ribbon" aria-hidden="true">
          <div className="atl-ribbon-track">
            {ribbon.map((r) => <span key={r.key}>{r.name}</span>)}
          </div>
        </div>

        <section id="come-funziona" className="atl-steps-sec">
          <div className="wrap">
            <p className="atl-eyebrow">{c.stepsEyebrow}</p>
            <h2 className="atl-h2">{c.stepsTitle}</h2>
            <ol className="atl-steps">
              {c.steps.map(([title, body], i) => (
                <li key={title}>
                  <span className="atl-step-n">0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="modelli" className="section">
          <div className="wrap">
            <Models catalog={catalog} lang={lang} />
          </div>
        </section>

        <section id="faq" className="section rule-top">
          <div className="wrap narrow">
            <h2 className="section-title">{t.home.faqTitle}</h2>
            <div className="faq">
              {t.home.faq.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="atl-closing">
          <div className="wrap">
            <p className="atl-closing-text">{c.closing}</p>
          </div>
        </section>
      </main>
      <footer className="atl-foot">
        <div className="wrap atl-foot-inner">
          <div>
            <span className="atl-foot-word">InviteMe</span>
            <p className="atl-foot-line">{c.footerLine}</p>
          </div>
          <nav aria-label="Footer">
            <a href="#modelli">{t.footerModels}</a>
            <a href="#faq">{c.faq}</a>
            <a href="/accedi">{t.footerLogin}</a>
            <a href="/termini">{t.home.terms}</a>
            <a href="/privacy">{t.home.privacy}</a>
          </nav>
          <span className="atl-foot-copy">{t.copyright}</span>
        </div>
      </footer>
    </>
  );
}
