import { Nav } from "@/components/Nav";
import { Models } from "@/components/Models";
import { Invitation } from "@/components/Invitation";
import { Experience } from "@/components/Experience";
import { activeFeatures, defaultConfig, formatPrice, getStyle, type AddonKey, type Catalog, type InviteConfig } from "@inviteme/shared";
import { apiPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { rsvp: "✓", program: "≡", map: "◎", music: "♪", countdown: "◷", gallery: "▦", express: "→" };

export default async function Home() {
  const catalog = (await apiPublic<Catalog>("/api/catalog")) ?? { models: [], addons: [], styles: [], music: [] };
  const style = getStyle(catalog, "avorio");
  const hero: InviteConfig = {
    ...defaultConfig(catalog, "invitation-rsvp", "wedding"),
    title: "Elena & Marco",
    hosts: "Elena e Marco",
    eventDate: "2027-06-12",
    eventTime: "18:00",
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
              <p className="eyebrow">Inviti digitali per matrimoni ed eventi</p>
              <h1>Un invito che si apre con un tocco, e suona.</h1>
              <p className="lede">
                Una busta sigillata, la musica che parte al primo tap, il programma con gli orari, la mappa e la conferma di presenza. Tutto in un solo link che i vostri ospiti aprono dal telefono.
              </p>
              <div className="cta-row">
                <a className="btn solid lg" href="#modelli">Crea il tuo invito</a>
                <a className="btn outline lg" href="#funzioni">Scopri le funzioni</a>
              </div>
              <ul className="proof">
                <li>Pagamento unico, nessun abbonamento</li>
                <li>Ospiti illimitati</li>
                <li>Conferme in tempo reale</li>
              </ul>
            </div>
            <div className="hero-visual">
              <div className="hero-stack">
                <div className="hero-phone">
                  <Experience title={hero.title} accent={style.accent} paper={style.bg} ink={style.ink} musicSrc={null} cover={false}>
                    <Invitation config={hero} style={style} features={heroFeatures} />
                  </Experience>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Un&apos;esperienza, non un file</p>
              <h2>Gli ospiti non scaricano un PDF: aprono una busta.</h2>
            </header>
            <div className="pillars">
              <div className="pillar">
                <span className="pillar-n">01</span>
                <h3>Copertina sigillata</h3>
                <p>Un sigillo con il monogramma degli sposi. Il tocco apre la busta e l&apos;invito si rivela, con i petali che scendono sullo sfondo.</p>
              </div>
              <div className="pillar">
                <span className="pillar-n">02</span>
                <h3>Musica al primo tap</h3>
                <p>Un brano dalla libreria InviteMe, o il vostro. Parte quando l&apos;ospite apre l&apos;invito, con un pulsante per metterla in pausa.</p>
              </div>
              <div className="pillar">
                <span className="pillar-n">03</span>
                <h3>Programma e conferma</h3>
                <p>Orari in timeline, conto alla rovescia, mappa e un modulo di conferma con le domande che scegliete voi.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="modelli" className="section band">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">I modelli</p>
              <h2>Scegli il modello, poi costruisci il resto.</h2>
              <p className="lede">Ogni modello si personalizza in tutto. Lo stile si cambia in qualsiasi momento prima del pagamento.</p>
            </header>
            <Models catalog={catalog} />
          </div>
        </section>

        <section id="funzioni" className="section">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Su misura</p>
              <h2>Ogni funzione ha il suo prezzo. Paghi solo quello che usi.</h2>
              <p className="lede">Nel modello Su misura aggiungi le funzioni una per una. Il totale è sempre visibile prima del pagamento.</p>
            </header>
            <ul className="fn-grid">
              {catalog.addons.filter((a) => a.enabled).map((a) => (
                <li key={a.key} className="fn">
                  <span className="fn-icon" aria-hidden>{ICON[a.key] ?? "+"}</span>
                  <div>
                    <h3>{a.label}</h3>
                    <p>{a.description}</p>
                  </div>
                  <b>+{formatPrice(a.cents)}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="come-funziona" className="section band">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Come funziona</p>
              <h2>Dalla scelta all&apos;ultimo ospite.</h2>
            </header>
            <ol className="steps">
              <li><span className="step-n">01</span><h3>Scegli il modello</h3><p>Save the Date per annunciare la data, invito completo o Su misura.</p></li>
              <li><span className="step-n">02</span><h3>Personalizza</h3><p>Testi, stile, foto, programma, musica e domande. L&apos;anteprima si aggiorna mentre scrivi.</p></li>
              <li><span className="step-n">03</span><h3>Paga una volta</h3><p>Pagamento sicuro, nessun abbonamento. Dopo il pagamento l&apos;invito è attivo.</p></li>
              <li><span className="step-n">04</span><h3>Invia e segui</h3><p>Il link via email o WhatsApp. Le conferme arrivano in tempo reale.</p></li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Carta o digitale</p>
              <h2>Lo stesso effetto, senza stampa né spedizione.</h2>
            </header>
            <div className="compare">
              <div className="compare-col">
                <h3>Invito cartaceo</h3>
                <ul>
                  <li>Progetto, stampa e buste da pagare per ogni invito</li>
                  <li>Spedizione con tempi e costi che crescono con gli ospiti</li>
                  <li>Ogni modifica dell&apos;ultimo minuto costa di nuovo</li>
                  <li>Le risposte si raccolgono una per una, a mano</li>
                </ul>
              </div>
              <div className="compare-col is-featured">
                <h3>Invito digitale InviteMe</h3>
                <ul>
                  <li>Un pagamento, nessun costo di stampa o spedizione</li>
                  <li>Un link per tutti, pronto in pochi secondi</li>
                  <li>Modificabile fino al pagamento, sempre accessibile dopo</li>
                  <li>Conferme, esigenze alimentari e messaggi in un unico pannello</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section band">
          <div className="wrap narrow">
            <header className="section-head">
              <p className="eyebrow">Domande frequenti</p>
              <h2>Le risposte prima di iniziare.</h2>
            </header>
            <div className="faq">
              <details>
                <summary>Quanti ospiti posso invitare?</summary>
                <p>Quanti ne volete. Tutti ricevono lo stesso link, senza costi aggiuntivi.</p>
              </details>
              <details>
                <summary>Posso cambiare l&apos;invito dopo il pagamento?</summary>
                <p>No: dal pagamento l&apos;invito è bloccato, così il link già condiviso resta uguale. Fino ad allora potete cambiare tutto, stile incluso.</p>
              </details>
              <details>
                <summary>La musica è inclusa?</summary>
                <p>È una funzione a parte. Potete scegliere un brano dalla libreria InviteMe, oppure usare un file vostro di cui avete i diritti.</p>
              </details>
              <details>
                <summary>Come ricevo le risposte?</summary>
                <p>Compaiono nel pannello in tempo reale, si scaricano in CSV e arriva una email per ogni conferma.</p>
              </details>
              <details>
                <summary>Come avviene il pagamento?</summary>
                <p>Attraverso il checkout sicuro di Shopify. InviteMe non conserva i dati della carta.</p>
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
