"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { formatPrice, totalCents, type AddonKey, type Catalog } from "@inviteme/shared";
import type { Lang } from "@/lib/ui";

// Pagamento prima dell'invito: si scelgono le funzioni a pagamento, si paga, poi l'invito nasce nel profilo.
export function NewCheckout({ catalog, lang, model, theme, event }: { catalog: Catalog; lang: Lang; model: string; theme: string; event: string }) {
  const it = lang !== "en";
  const m = catalog.models.find((x) => x.id === model && x.enabled);
  const t = catalog.themes.find((x) => x.enabled && x.manifest.id === theme)?.manifest;
  const [addons, setAddons] = useState<AddonKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const money = (c: number) => formatPrice(c, it ? "it-IT" : "en-US");
  const total = useMemo(() => (m ? totalCents(catalog, m.id, addons) : 0), [catalog, m, addons]);
  const options = m ? m.options.map((k) => catalog.addons.find((a) => a.key === k)).filter((a): a is NonNullable<typeof a> => !!a && a.enabled) : [];

  if (!m) {
    return (
      <main className="ck">
        <section className="ck-empty">
          <h1 className="ck-title">{it ? "Scegli prima un modello" : "Choose a model first"}</h1>
          <p>{it ? "Il pagamento parte dalla scelta fatta in home." : "Payment starts from the choice made on the home page."}</p>
          <a className="ck-pay" href="/#modelli">{it ? "Vai alla scelta" : "Go to the choice"}</a>
        </section>
      </main>
    );
  }

  async function pay() {
    if (!m) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: m.id, themeId: theme || undefined, eventType: event, addons }),
      });
      const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? (it ? "Pagamento non disponibile" : "Payment not available"));
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setBusy(false);
    }
  }

  return (
    <main className="ck">
      <header className="ck-head">
        <p className="ck-kicker">{it ? "Il tuo invito" : "Your invitation"}</p>
        <h1 className="ck-title">{m.name}</h1>
        <p className="ck-lede">{m.tagline}</p>
      </header>

      <div className="ck-grid">
        <section className="ck-card">
          <h2 className="ck-h">{it ? "Incluso nel prezzo" : "Included in the price"}</h2>
          <ul className="ck-list">
            {m.included.map((k) => (
              <li key={k}>
                <span className="ck-tick"><Check size={14} aria-hidden="true" /></span>
                {catalog.addons.find((a) => a.key === k)?.label ?? k}
              </li>
            ))}
          </ul>
          {t && (
            <div className="ck-style">
              <span className="ck-style-label">{it ? "Stile scelto" : "Chosen style"}</span>
              <strong>{t.name}</strong>
            </div>
          )}
        </section>

        <aside className="ck-card ck-pay-card">
          {options.length > 0 && (
            <>
              <h2 className="ck-h">{it ? "Funzioni in più" : "Extra features"}</h2>
              <div className="ck-options">
                {options.map((a) => {
                  const on = addons.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      className={`ck-option${on ? " is-on" : ""}`}
                      onClick={() => setAddons((x) => (x.includes(a.key) ? x.filter((k) => k !== a.key) : [...x, a.key]))}
                    >
                      <span className="ck-option-ico">{on ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}</span>
                      <span className="ck-option-text">
                        <strong>{a.label}</strong>
                        <small>{a.description}</small>
                      </span>
                      <span className="ck-option-price">+ {money(a.cents)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="ck-total">
            <span>{it ? "Totale, pagamento unico" : "Total, one-time payment"}</span>
            <strong>{money(total)}</strong>
          </div>

          {error && <p role="alert" className="ck-error">{error}</p>}
          <button type="button" className="ck-pay" disabled={busy} onClick={pay}>
            <Sparkles size={16} aria-hidden="true" />
            {busy ? (it ? "Un momento…" : "One moment…") : it ? "Paga e crea il mio invito" : "Pay and create my invitation"}
          </button>
          <p className="ck-note">
            {it
              ? "Dopo il pagamento l'invito compare nel tuo profilo e si apre il builder. Resta in bozza finché non lo pubblichi."
              : "After payment the invitation appears in your profile and the builder opens. It stays a draft until you publish it."}
          </p>
        </aside>
      </div>
    </main>
  );
}
