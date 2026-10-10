import { Nav } from "@/components/Nav";
import { Models } from "@/components/Models";
import { Invitation } from "@/components/Invitation";
import { MODELS, PRICING, formatPrice } from "@/lib/catalog";
import { defaultConfig } from "@/lib/invitation";

const heroSample = {
  ...defaultConfig("invitation-rsvp", "wedding"),
  styleId: "avorio",
  title: "Elena & Marco",
  hosts: "Elena e Marco",
  eventDate: "2027-06-12",
  eventTime: "18:00",
  message: "Abbiamo il piacere di invitarvi a festeggiare il nostro sì.",
  addons: ["countdown" as const],
};

const addons = Object.entries(PRICING.addons) as [keyof typeof PRICING.addons, { label: string; cents: number }][];

export default function Home() {
  return (
    <>
      <Nav current="home" />
      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Inviti digitali per matrimoni ed eventi</p>
              <h1>Il vostro invito, condiviso con un solo link.</h1>
              <p className="lede">
                Scegliete un modello, personalizzate ogni dettaglio mentre lo guardate prendere forma, pagate una volta sola
                e inviate il link a tutti gli ospiti. Le conferme arrivano in un unico posto.
              </p>
              <div className="cta-row">
                <a className="btn solid" href="#modelli">Scegli un modello</a>
                <a className="btn outline" href="#come-funziona">Come funziona</a>
              </div>
              <ul className="proof">
                <li>Pagamento unico</li>
                <li>Ospiti illimitati</li>
                <li>Conferme in tempo reale</li>
              </ul>
            </div>
            <div className="hero-visual" aria-hidden>
              <div className="phone">
                <div className="phone-screen">
                  <Invitation config={heroSample} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modelli" className="section">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">I modelli</p>
              <h2>Due modelli, tre stili per ogni evento.</h2>
              <p className="lede">Scegliete il modello in base a cosa dovete comunicare adesso. Lo stile si può cambiare in qualsiasi momento prima del pagamento.</p>
            </header>
            <Models />
          </div>
        </section>

        <section id="come-funziona" className="section band">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Come funziona</p>
              <h2>Dalla scelta all&apos;ultimo ospite, in quattro passi.</h2>
            </header>
            <ol className="steps">
              <li><span className="step-n">01</span><h3>Scegliete il modello</h3><p>Save the Date per annunciare la data, invito completo per tutti i dettagli e le conferme.</p></li>
              <li><span className="step-n">02</span><h3>Personalizzate</h3><p>Testi, stile, foto, programma e domande di conferma. Vedete l&apos;invito aggiornarsi mentre scrivete.</p></li>
              <li><span className="step-n">03</span><h3>Pagate una volta</h3><p>Un pagamento sicuro, nessun abbonamento. Dopo il pagamento l&apos;invito è attivo.</p></li>
              <li><span className="step-n">04</span><h3>Inviate e seguite</h3><p>Inviate il link via email o WhatsApp e seguite le risposte in tempo reale.</p></li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Carta o digitale</p>
              <h2>Stesso effetto, senza stampa né spedizione.</h2>
            </header>
            <div className="compare">
              <div className="compare-col">
                <h3>Invito cartaceo</h3>
                <ul>
                  <li>Progetto grafico, stampa e buste da pagare per ogni invito</li>
                  <li>Spedizione con tempi e costi che crescono con gli ospiti</li>
                  <li>Ogni modifica dell&apos;ultimo minuto costa di nuovo</li>
                  <li>Le risposte si raccolgono una per una, a mano</li>
                </ul>
              </div>
              <div className="compare-col is-featured">
                <h3>Invito digitale InviteMe</h3>
                <ul>
                  <li>Un pagamento, nessun costo di stampa o spedizione</li>
                  <li>Un link per tutti gli ospiti, arriva in pochi secondi</li>
                  <li>Modificabile fino al pagamento, sempre accessibile dopo</li>
                  <li>Conferme, esigenze alimentari e messaggi in un unico pannello</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="section band">
          <div className="wrap split">
            <div>
              <p className="eyebrow">Per i vostri ospiti</p>
              <h2>Piccoli dettagli che si notano.</h2>
              <p className="lede">Un invito pensato per chi lo riceve: si apre sul telefono, si legge in un attimo, si risponde in pochi secondi.</p>
            </div>
            <ul className="feature-list">
              <li><b>Conto alla rovescia</b> fino alla data, aggiornato in tempo reale.</li>
              <li><b>Mappa e indicazioni</b> con un tocco per arrivare al luogo.</li>
              <li><b>Musica di sottofondo</b> scelta da voi, con controllo del volume.</li>
              <li><b>Conferma di presenza</b> con numero di persone ed esigenze alimentari.</li>
              <li><b>Un link unico</b>: nessuna app da installare per gli ospiti.</li>
            </ul>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Il vostro pannello</p>
              <h2>Chi viene, chi non può, cosa mangia.</h2>
              <p className="lede">Ogni conferma compare subito. Potete scaricare tutto in CSV e ricevere una email per ogni risposta.</p>
            </header>
            <div className="panel-mock" aria-label="Esempio di pannello conferme">
              <div className="panel-mock-head">
                <span>Conferme di presenza</span>
                <span className="mock-tag">Dati di esempio</span>
              </div>
              <div className="panel-mock-stats">
                <div><span>Presenti</span><strong>128</strong></div>
                <div><span>Non possono</span><strong>9</strong></div>
                <div><span>Persone totali</span><strong>231</strong></div>
              </div>
              <table>
                <thead><tr><th>Ospite</th><th>Risposta</th><th>Persone</th><th>Esigenze</th></tr></thead>
                <tbody>
                  <tr><td>Famiglia Rossi</td><td><span className="pill yes">Presenti</span></td><td>4</td><td>Senza glutine</td></tr>
                  <tr><td>Giulia Bianchi</td><td><span className="pill yes">Presenti</span></td><td>2</td><td>–</td></tr>
                  <tr><td>Andrea Neri</td><td><span className="pill no">Non possono</span></td><td>–</td><td>–</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="prezzi" className="section band">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">Prezzi</p>
              <h2>Un pagamento per modello, extra a scelta.</h2>
              <p className="lede">Nessun abbonamento e nessun costo per ospite. Il prezzo mostrato è sempre quello che pagate.</p>
            </header>
            <div className="prices">
              {MODELS.map((m) => (
                <div key={m.id} className="price-card">
                  <p className="eyebrow">{m.name}</p>
                  <p className="price">{formatPrice(m.priceCents)}</p>
                  <p className="hint">{m.description}</p>
                  <a className="btn outline wide" href="#modelli">Scegli {m.name}</a>
                </div>
              ))}
              <div className="price-card">
                <p className="eyebrow">Extra</p>
                <ul className="extras">
                  {addons.map(([key, a]) => (
                    <li key={key}><span>{a.label}</span><b>+{formatPrice(a.cents)}</b></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section">
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
                <p>No: dal pagamento l&apos;invito è bloccato, così il link che avete già condiviso resta uguale. Fino ad allora potete cambiare tutto, stile incluso.</p>
              </details>
              <details>
                <summary>Come ricevo le risposte?</summary>
                <p>Compaiono nel pannello in tempo reale, potete scaricarle in CSV e riceverete una email per ogni conferma.</p>
              </details>
              <details>
                <summary>Come invio il link agli ospiti?</summary>
                <p>Dal pannello Ospiti potete inviarlo direttamente via email, oppure copiarlo e condividerlo su WhatsApp.</p>
              </details>
              <details>
                <summary>Come avviene il pagamento?</summary>
                <p>Il pagamento passa dal checkout sicuro di Shopify. InviteMe non conserva i dati della carta.</p>
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
            <a href="#prezzi">Prezzi</a>
            <a href="#faq">Domande</a>
            <a href="/accedi">Accedi</a>
          </nav>
          <span className="fine">© 2026 InviteMe</span>
        </div>
      </footer>
    </>
  );
}
