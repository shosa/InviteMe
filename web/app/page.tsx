import { Nav } from "@/components/Nav";
import { Models } from "@/components/Models";
import { Invitation } from "@/components/Invitation";
import { Experience } from "@/components/Experience";
import { Glyph } from "@/components/Glyph";
import { activeFeatures, defaultConfig, formatPrice, getStyle, type AddonKey, type Catalog, type InviteConfig } from "@inviteme/shared";
import { apiPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = (await apiPublic<Catalog>("/api/catalog")) ?? { models: [], addons: [], styles: [], music: [] };
  const style = getStyle(catalog, "carta");
  const hero: InviteConfig = {
    ...defaultConfig(catalog, "invitation-rsvp", "wedding"),
    title: "Elena & Marco",
    hosts: "Elena e Marco",
    eventDate: "2027-06-12",
    eventTime: "18:00",
    venue: "Villa dei Glicini",
    address: "Via dei Giardini 12, Firenze",
    message: "Con gioia vi invitiamo a festeggiare il nostro sì.",
    addons: ["countdown", "map"],
  };
  const heroFeatures = [...activeFeatures(catalog, "invitation-rsvp", hero.addons)] as AddonKey[];

  return (
    <>
      <Nav current="home" />
      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1>Un invito che si apre al tocco.</h1>
              <p className="lede">
                Busta sigillata, musica che parte al primo tap, programma con gli orari, mappa e conferma di presenza. Un solo link per tutti gli ospiti.
              </p>
              <div className="cta-row">
                <a className="btn solid lg" href="#modelli">Scegli un modello</a>
                <a className="text-link" href="#come-funziona">Come funziona</a>
              </div>
              <p className="fine">Pagamento unico. Nessun abbonamento. Ospiti illimitati.</p>
            </div>
            <div className="sheet" aria-label="Esempio di invito">
              <div className="sheet-paper">
                <Experience title={hero.title} accent={style.accent} paper={style.bg} ink={style.ink} musicSrc={null} cover={false}>
                  <Invitation config={hero} style={style} features={heroFeatures} />
                </Experience>
              </div>
            </div>
          </div>
        </section>

        <section id="modelli" className="section">
          <div className="wrap">
            <h2 className="section-title">Due modi di invitare, e un terzo su misura.</h2>
            <Models catalog={catalog} />
          </div>
        </section>

        <section id="funzioni" className="section rule-top">
          <div className="wrap split">
            <div>
              <h2 className="section-title">Ogni funzione ha il suo prezzo.</h2>
              <p className="lede">Nel modello Su misura scegli una alla volta. Il totale è sempre visibile prima del pagamento.</p>
            </div>
            <ul className="price-list">
              {catalog.addons.filter((a) => a.enabled).map((a) => (
                <li key={a.key}>
                  <Glyph name={a.key} />
                  <div className="price-text">
                    <span className="price-name">{a.label}</span>
                    <span className="price-desc">{a.description}</span>
                  </div>
                  <span className="price-leader" aria-hidden />
                  <b>+{formatPrice(a.cents)}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section rule-top">
          <div className="wrap">
            <h2 className="section-title">Gli ospiti aprono una busta, non un PDF.</h2>
            <div className="columns">
              <div>
                <h3>Copertina sigillata</h3>
                <p>Il monogramma degli sposi sul sigillo. Il tocco apre la busta e l&apos;invito occupa la pagina.</p>
              </div>
              <div>
                <h3>Musica al primo tap</h3>
                <p>Un brano dalla libreria, o il vostro di cui avete i diritti. Parte con l&apos;apertura, si mette in pausa in un gesto.</p>
              </div>
              <div>
                <h3>Programma e conferma</h3>
                <p>Orari in sequenza, conto alla rovescia, mappa e un modulo con le domande che scegliete voi.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="come-funziona" className="section rule-top">
          <div className="wrap">
            <h2 className="section-title">Dal modello al link in quattro passi.</h2>
            <ol className="steps">
              <li><span className="step-n">1</span><h3>Scegli il modello</h3><p>Save the Date per la data, invito completo per tutto il resto, oppure Su misura.</p></li>
              <li><span className="step-n">2</span><h3>Personalizza</h3><p>Testi, stile, foto, programma, musica e domande. L&apos;anteprima segue ogni modifica.</p></li>
              <li><span className="step-n">3</span><h3>Paga una volta</h3><p>Pagamento sicuro, nessun abbonamento. Da quel momento l&apos;invito è attivo.</p></li>
              <li><span className="step-n">4</span><h3>Invia e segui</h3><p>Il link via email o WhatsApp. Le risposte arrivano mentre gli ospiti rispondono.</p></li>
            </ol>
          </div>
        </section>

        <section className="section rule-top">
          <div className="wrap split">
            <h2 className="section-title">Quanto costa la carta, e quanto il digitale.</h2>
            <div className="compare">
              <div>
                <h3>Invito cartaceo</h3>
                <ul>
                  <li>Progetto, stampa e buste per ogni invito</li>
                  <li>Spedizione: tempi e costi crescono con gli ospiti</li>
                  <li>Ogni modifica dell&apos;ultimo minuto costa di nuovo</li>
                  <li>Risposte raccolte una per una, a mano</li>
                </ul>
              </div>
              <div className="compare-yes">
                <h3>Invito digitale</h3>
                <ul>
                  <li>Un pagamento, nessun costo di stampa o spedizione</li>
                  <li>Un link per tutti, pronto in pochi secondi</li>
                  <li>Modificabile fino al pagamento</li>
                  <li>Conferme e note alimentari in un solo pannello</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section rule-top">
          <div className="wrap narrow">
            <h2 className="section-title">Domande.</h2>
            <div className="faq">
              <details>
                <summary>Quanti ospiti posso invitare?</summary>
                <p>Quanti ne volete. Tutti ricevono lo stesso link, senza costi aggiuntivi.</p>
              </details>
              <details>
                <summary>Posso cambiare l&apos;invito dopo il pagamento?</summary>
                <p>No. Dal pagamento l&apos;invito è bloccato, così il link già condiviso resta lo stesso. Fino ad allora cambiate tutto, stile incluso.</p>
              </details>
              <details>
                <summary>La musica è inclusa?</summary>
                <p>È una funzione a parte. Potete scegliere un brano dalla libreria o usare un file vostro di cui avete i diritti.</p>
              </details>
              <details>
                <summary>Come ricevo le risposte?</summary>
                <p>Compaiono nel pannello in tempo reale, si scaricano in CSV e arriva un&apos;email per ogni conferma.</p>
              </details>
              <details>
                <summary>Come avviene il pagamento?</summary>
                <p>Con il checkout sicuro di Shopify. InviteMe non conserva i dati della carta.</p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap foot-inner">
          <span className="logo-word">InviteMe</span>
          <nav aria-label="Footer">
            <a href="#modelli">Modelli</a>
            <a href="#funzioni">Funzioni</a>
            <a href="#faq">Domande</a>
            <a href="/accedi">Accedi</a>
          </nav>
          <span className="fine">© 2026 InviteMe</span>
        </div>
      </footer>
    </>
  );
}
