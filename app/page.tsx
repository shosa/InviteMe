import { CreateButton, Gallery } from "@/components/Gallery";
import { Invitation } from "@/components/Invitation";
import { CATEGORIES, PRICING, formatPrice } from "@/lib/catalog";
import { defaultConfig } from "@/lib/invitation";

const hero = {
  ...defaultConfig("aurora-vows", "wedding"),
  title: "Elena & Marco",
  hosts: "Elena e Marco",
  message: "Siamo felici di festeggiare con voi il nostro sì.",
  eventDate: "2027-06-12",
  colors: { bg: "#1c1420", ink: "#f7ead8", accent: "#e8b86d" },
  font: "serif" as const,
  addons: ["countdown" as const],
};

export default function Home() {
  const addons = Object.entries(PRICING.addons) as [keyof typeof PRICING.addons, { label: string; cents: number }][];

  return (
    <main>
      <nav className="top">
        <a href="/" className="brand">InviteMe</a>
        <div className="top-links">
          <a href="#gallery">Modelli</a>
          <a href="#come">Come funziona</a>
          <a href="#prezzi">Prezzi</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </nav>

      <section className="hero">
        <div className="aurora" aria-hidden />
        <div className="hero-copy">
          <p className="kicker reveal">Inviti digitali · dal 2026</p>
          <h1 className="reveal d1">Il tuo invito, <em>già più bello</em> di quanto immagini.</h1>
          <p className="lede reveal d2">
            Scegli un modello, personalizzalo in tempo reale, paga una volta sola e condividi un solo link con tutti i tuoi ospiti. Senza limiti di persone.
          </p>
          <div className="cta reveal d3">
            <CreateButton label="Crea il tuo invito" className="btn primary big" />
            <a href="#gallery" className="btn ghost big">Vedi i modelli</a>
          </div>
          <ul className="trust reveal d4">
            <li><b>Ospiti illimitati</b> con un solo link</li>
            <li><b>Consegna express</b> 24–48 ore</li>
            <li><b>RSVP live</b> con risposte in dashboard</li>
          </ul>
        </div>
        <div className="hero-art reveal d2">
          <div className="float">
            <Invitation config={hero} />
          </div>
        </div>
      </section>

      <section id="gallery" className="section">
        <header className="section-head">
          <p className="kicker">Modelli</p>
          <h2>Un modello per ogni occasione</h2>
          <p className="lede">Matrimoni, compleanni, eventi aziendali e lauree. Ogni modello è personalizzabile in tutto.</p>
        </header>
        <Gallery />
      </section>

      <section id="come" className="section steps">
        <header className="section-head">
          <p className="kicker">Come funziona</p>
          <h2>Dalla scelta al link in tre passi</h2>
        </header>
        <ol>
          <li><span>01</span><h3>Scegli</h3><p>Sfoglia i modelli per tipologia e apri il configuratore.</p></li>
          <li><span>02</span><h3>Personalizza</h3><p>Testi, colori, carattere, foto, programma e domande RSVP: vedi tutto mentre modifichi.</p></li>
          <li><span>03</span><h3>Condividi</h3><p>Paga una volta sola e ricevi il link. Mandalo su WhatsApp, email o QR code.</p></li>
        </ol>
      </section>

      <section id="prezzi" className="section pricing">
        <header className="section-head">
          <p className="kicker">Prezzi</p>
          <h2>Un pagamento, nessun costo per ospite</h2>
          <p className="lede">Parti da {formatPrice(PRICING.basePriceCents)} e aggiungi solo quello che ti serve.</p>
        </header>
        <div className="price-card">
          <div>
            <span className="price-base">{formatPrice(PRICING.basePriceCents)}</span>
            <p>Invito base, ospiti illimitati, link valido fino a due mesi dopo l'evento.</p>
          </div>
          <ul>
            {addons.map(([key, a]) => (
              <li key={key}><span>{a.label}</span><b>+{formatPrice(a.cents)}</b></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section faq">
        <header className="section-head">
          <p className="kicker">Domande</p>
          <h2>Tutto chiaro?</h2>
        </header>
        <details>
          <summary>Quanti ospiti posso invitare?</summary>
          <p>Un solo link, senza limiti di persone e senza costi per ospite.</p>
        </details>
        <details>
          <summary>Posso modificare l'invito dopo il pagamento?</summary>
          <p>Il testo si blocca al pagamento per proteggere l'ordine. Fino ad allora puoi cambiare tutto.</p>
        </details>
        <details>
          <summary>Come ricevo le risposte degli ospiti?</summary>
          <p>Ogni risposta RSVP compare nella dashboard in tempo reale.</p>
        </details>
        <details>
          <summary>Quali categorie sono disponibili?</summary>
          <p>{CATEGORIES.map((c) => c.label).join(", ")}.</p>
        </details>
      </section>

      <footer className="foot">
        <span>© 2026 InviteMe</span>
        <a href="/dashboard">Dashboard</a>
      </footer>
    </main>
  );
}
