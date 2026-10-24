"use client";

import { useMemo, useState } from "react";
import { formatPrice, totalCents, type AddonKey, type Catalog } from "@inviteme/shared";
import type { Lang } from "@/lib/ui";

// Pagina di pagamento prima dell'invito: si scelgono le funzioni a pagamento, si paga, poi l'invito nasce nel profilo.
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

  if (!m) return <main className="wrap narrow"><p className="hint">{it ? "Scegli prima un modello dalla home." : "Choose a model from the home page first."}</p><a href="/#modelli">{it ? "Torna alla scelta" : "Back to choice"}</a></main>;

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
    <main className="wrap narrow checkout-new">
      <p className="kicker">{it ? "Pagamento" : "Payment"}</p>
      <h1>{m.name}</h1>
      <p className="hint">{m.tagline}</p>
      {t && <p>{it ? "Stile: " : "Style: "}<strong>{t.name}</strong></p>}

      <section className="checkout-included">
        <h2>{it ? "Incluso nel prezzo" : "Included in the price"}</h2>
        <ul>{m.included.map((k) => <li key={k}>{catalog.addons.find((a) => a.key === k)?.label ?? k}</li>)}</ul>
      </section>

      {options.length > 0 && (
        <section className="checkout-options">
          <h2>{it ? "Funzioni in più" : "Extra features"}</h2>
          {options.map((a) => (
            <label key={a.key} className="checkout-option">
              <input type="checkbox" checked={addons.includes(a.key)} onChange={() => setAddons((x) => (x.includes(a.key) ? x.filter((k) => k !== a.key) : [...x, a.key]))} />
              <span>{a.label}</span>
              <small>{a.description}</small>
              <strong>+ {money(a.cents)}</strong>
            </label>
          ))}
        </section>
      )}

      <div className="checkout-total">
        <span>{it ? "Totale, pagamento unico" : "Total, one-time payment"}</span>
        <strong>{money(total)}</strong>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <button type="button" className="btn solid" disabled={busy} onClick={pay}>
        {busy ? (it ? "Un momento…" : "One moment…") : it ? "Paga e crea il mio invito" : "Pay and create my invitation"}
      </button>
      <p className="hint">{it ? "Dopo il pagamento l'invito compare nel tuo profilo e si apre il builder. Resta in bozza finché non lo pubblichi." : "After payment the invitation appears in your profile and the builder opens. It stays a draft until you publish it."}</p>
    </main>
  );
}
