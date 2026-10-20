import { Nav } from "@/components/Nav";
import { getLang } from "@/lib/i18n";
import { ui } from "@/lib/ui";
import { Models } from "@/components/Models";
import { type Catalog } from "@inviteme/shared";
import { apiPublic } from "@/lib/api";
import { Typing } from "@/components/Typing";
import { HeroScene } from "@/components/HeroScene";
import { dateParts } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Frasi che si scrivono a rotazione nel titolo della home.
const HERO_PHRASES_EN = ["Your invitation, ready in an afternoon.", "One date, one link, every guest.", "Know who is coming before the day.", "Pay once, no subscriptions."];
const HERO_PHRASES = ["Il vostro invito, pronto in un pomeriggio.", "Una data, un link, tutti gli ospiti.", "Sapete chi viene prima del giorno.", "Si paga una volta, senza abbonamenti."];

export default async function Home() {
  const lang = await getLang();
  const t = ui(lang);
  const h = t.home;
  const phrases = lang === "en" ? HERO_PHRASES_EN : HERO_PHRASES;
  const catalog = (await apiPublic<Catalog>("/api/catalog")) ?? { models: [], addons: [], themes: [], music: [] };
  // Data d'esempio dell'hero: la scheda è fissa, la pagina invito reale si vede nelle anteprime dei modelli.
  const hero = { title: "Elena & Marco", eventDate: "2027-06-12", eventTime: "18:00" };

  return (
    <>
      <Nav current="home" lang={lang} />
      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1 className="hero-title"><Typing phrases={phrases} /></h1>
              <p className="lede">
                {t.heroLede}
              </p>
              <div className="cta-row">
                <a className="btn solid lg" href="#modelli">{t.ctaModels}</a>
                <a className="text-link" href="#come-funziona">{t.ctaHow}</a>
              </div>
              <p className="fine">{t.heroFine}</p>
            </div>
            <HeroScene names={hero.title} day={hero.eventDate.slice(8, 10)} month={dateParts(hero.eventDate)?.month ?? ""} year={hero.eventDate.slice(0, 4)} target={`${hero.eventDate}T${hero.eventTime}`} photo="/stock/outdoor-table-angel-ayala.jpg" />
          </div>
        </section>

        <section id="modelli" className="section">
          <div className="wrap">
            <h2 className="section-title">{h.modelsTitle}</h2>
            <Models catalog={catalog} lang={lang} />
          </div>
        </section>

        <section className="section rule-top">
          <div className="wrap">
            <h2 className="section-title">{h.seeTitle}</h2>
            <div className="columns">
              <div>
                <h3>{h.seeSeal}</h3>
                <p>{h.seeSealBody}</p>
              </div>
              <div>
                <h3>{h.seeMusic}</h3>
                <p>{h.seeMusicBody}</p>
              </div>
              <div>
                <h3>{h.seeReply}</h3>
                <p>{h.seeReplyBody}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="come-funziona" className="section rule-top">
          <div className="wrap">
            <h2 className="section-title">{h.stepsTitle}</h2>
            <ol className="steps">
              <li><span className="step-n">1</span><h3>{h.step1}</h3><p>{h.step1Body}</p></li>
              <li><span className="step-n">2</span><h3>{h.step2}</h3><p>{h.step2Body}</p></li>
              <li><span className="step-n">3</span><h3>{h.step3}</h3><p>{h.step3Body}</p></li>
              <li><span className="step-n">4</span><h3>{h.step4}</h3><p>{h.step4Body}</p></li>
            </ol>
          </div>
        </section>

        <section className="section rule-top">
          <div className="wrap split">
            <h2 className="section-title">{h.costTitle}</h2>
            <div className="compare">
              <div>
                <h3>{h.paper}</h3>
                <ul>
                  {h.paperItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="compare-yes">
                <h3>{h.digital}</h3>
                <ul>
                  {h.digitalItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section rule-top">
          <div className="wrap narrow">
            <h2 className="section-title">{h.faqTitle}</h2>
            <div className="faq">
              {h.faq.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap foot-inner">
          <span className="logo-word">InviteMe</span>
          <nav aria-label="Footer">
            <a href="#modelli">{t.footerModels}</a>
            <a href="#faq">{t.footerFaq}</a>
            <a href="/accedi">{t.footerLogin}</a>
            <a href="/termini">{h.terms}</a>
            <a href="/privacy">{h.privacy}</a>
          </nav>
          <span className="fine">{t.copyright}</span>
        </div>
      </footer>
    </>
  );
}
